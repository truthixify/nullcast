// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IConfidentialERC20.sol";
import "./NullCastMarket.sol";

/**
 * @title StrategyVault
 * @notice Share-based copy-trading vault (Model B).
 *
 *   Deposit:  shares = (amount * totalShares) / vaultBalance
 *             First deposit: shares = amount
 *   Withdraw: payout = (myShares * vaultBalance) / totalShares
 *             Fee = performanceFeeBps applied to profit portion only
 *   Close:    distributes proportional shares to all remaining followers,
 *             sends accumulated fees to manager
 *
 *   All share amounts and balances are encrypted (euint64).
 *   The vault's cUSDT balance is the source of truth — winnings from
 *   market bets flow back as cUSDT automatically.
 */
contract StrategyVault is ZamaEthereumConfig, ReentrancyGuard {
    // ── Errors ─────────────────────────────────────────────────────────────

    error OnlyManager();
    error OnlyOwner();
    error ZeroAddress();
    error VaultClosed();
    error NoShares();
    error NoFees();

    // ── Events ─────────────────────────────────────────────────────────────

    event Deposit(address indexed follower, uint256 indexed vaultId);
    event Withdrawal(address indexed follower, uint256 indexed vaultId);
    event BetPlaced(uint256 indexed vaultId, address indexed market, bool isYes);
    event FeesClaimed(uint256 indexed vaultId, address indexed manager);
    event VaultSettled(uint256 indexed vaultId);

    // ── State ──────────────────────────────────────────────────────────────

    uint256 public vaultId;
    string public name;
    string public description;
    address public manager;
    address public factoryOwner;
    uint8 public requiredTier;
    uint16 public performanceFeeBps; // e.g. 1000 = 10%

    IConfidentialERC20 public cUSDT;
    bool public closed;
    bool public settled;

    /// @dev Encrypted shares
    euint64 private _totalShares;
    mapping(address => euint64) private _shares;

    /// @dev Encrypted: each follower's cost basis (total deposited)
    mapping(address => euint64) private _costBasis;

    /// @dev Encrypted: accumulated manager fees ready to claim
    euint64 private _accruedFees;

    /// @dev Follower tracking
    address[] private _followers;
    mapping(address => bool) private _isFollower;

    /// @dev Public stats
    uint256 public followerCount;
    uint256 public publicTotalDeposits;
    uint256 public marketsTraded;

    // ── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyManager() {
        if (msg.sender != manager) revert OnlyManager();
        _;
    }

    modifier onlyOpen() {
        if (closed) revert VaultClosed();
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────

    constructor(
        uint256 _vaultId,
        string memory _name,
        string memory _description,
        address _manager,
        uint8 _requiredTier,
        uint16 _performanceFeeBps,
        address _cUSDT,
        address _factoryOwner
    ) {
        if (_manager == address(0)) revert ZeroAddress();
        if (_cUSDT == address(0)) revert ZeroAddress();

        vaultId = _vaultId;
        name = _name;
        description = _description;
        manager = _manager;
        requiredTier = _requiredTier;
        performanceFeeBps = _performanceFeeBps;
        cUSDT = IConfidentialERC20(_cUSDT);
        factoryOwner = _factoryOwner;
    }

    // ── Follower Functions ─────────────────────────────────────────────────

    /**
     * @notice Deposit cUSDT and receive vault shares
     * @dev First deposit: shares = amount.
     *      After: shares = (amount * totalShares) / publicTotalDeposits
     *      Uses publicTotalDeposits (keeper-synced) for division since
     *      FHE division requires a plaintext divisor.
     */
    function deposit(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOpen nonReentrant {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Track follower
        if (!_isFollower[msg.sender]) {
            _isFollower[msg.sender] = true;
            _followers.push(msg.sender);
            followerCount++;
        }

        // Compute shares to mint
        euint64 newShares;
        if (!FHE.isInitialized(_totalShares) || publicTotalDeposits == 0) {
            // First deposit: 1:1 shares
            newShares = amount;
        } else {
            // shares = (amount * totalShares) / vaultBalance
            euint64 numerator = FHE.mul(amount, _totalShares);
            newShares = FHE.div(numerator, uint64(publicTotalDeposits));
        }

        // Update shares
        if (FHE.isInitialized(_shares[msg.sender])) {
            _shares[msg.sender] = FHE.add(_shares[msg.sender], newShares);
        } else {
            _shares[msg.sender] = newShares;
        }
        FHE.allowThis(_shares[msg.sender]);
        FHE.allow(_shares[msg.sender], msg.sender);

        // Update total shares
        if (FHE.isInitialized(_totalShares)) {
            _totalShares = FHE.add(_totalShares, newShares);
        } else {
            _totalShares = newShares;
        }
        FHE.allowThis(_totalShares);

        // Track cost basis for fee calculation
        if (FHE.isInitialized(_costBasis[msg.sender])) {
            _costBasis[msg.sender] = FHE.add(_costBasis[msg.sender], amount);
        } else {
            _costBasis[msg.sender] = amount;
        }
        FHE.allowThis(_costBasis[msg.sender]);
        FHE.allow(_costBasis[msg.sender], msg.sender);

        // Transfer cUSDT into vault
        FHE.allowTransient(amount, address(cUSDT));
        cUSDT.transferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, vaultId);
    }

    /**
     * @notice Withdraw — burn shares and receive proportional vault balance
     * @dev payout = (myShares * publicTotalDeposits) / totalSharesPublic
     *      Performance fee deducted from profit (payout - costBasis) only.
     *      Available anytime, vault open or closed.
     */
    function withdraw() external nonReentrant {
        if (!_isFollower[msg.sender]) revert NoShares();
        if (!FHE.isInitialized(_shares[msg.sender])) revert NoShares();
        if (publicTotalDeposits == 0) revert NoShares();
        if (publicTotalShares == 0) revert NoShares();

        // Compute payout: (myShares / totalShares) * vaultBalance
        euint64 numerator = FHE.mul(_shares[msg.sender], FHE.asEuint64(uint64(publicTotalDeposits)));
        euint64 grossPayout = FHE.div(numerator, uint64(publicTotalShares));

        // Compute profit: max(0, payout - costBasis)
        // Use FHE.select to avoid underflow
        euint64 costBasis = _costBasis[msg.sender];
        ebool hasProfit = FHE.gt(grossPayout, costBasis);
        euint64 profit = FHE.select(hasProfit, FHE.sub(grossPayout, costBasis), FHE.asEuint64(uint64(0)));

        // Fee on profit only: fee = profit * performanceFeeBps / 10000
        euint64 fee = FHE.div(FHE.mul(profit, FHE.asEuint64(uint64(performanceFeeBps))), uint64(10000));
        euint64 netPayout = FHE.sub(grossPayout, fee);

        // Accrue fee for manager
        if (FHE.isInitialized(_accruedFees)) {
            _accruedFees = FHE.add(_accruedFees, fee);
        } else {
            _accruedFees = fee;
        }
        FHE.allowThis(_accruedFees);

        // Burn shares
        _shares[msg.sender] = FHE.asEuint64(uint64(0));
        FHE.allowThis(_shares[msg.sender]);

        // Zero cost basis
        _costBasis[msg.sender] = FHE.asEuint64(uint64(0));
        FHE.allowThis(_costBasis[msg.sender]);

        // Transfer payout
        FHE.allowTransient(netPayout, address(cUSDT));
        cUSDT.transfer(msg.sender, netPayout);

        emit Withdrawal(msg.sender, vaultId);
    }

    // ── Manager Functions ──────────────────────────────────────────────────

    /**
     * @notice Place a bet from vault funds
     */
    function placeBetFromVault(
        address market,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        bool isYes
    ) external onlyManager onlyOpen nonReentrant {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(cUSDT));

        NullCastMarket(market).placeBet(encryptedAmount, inputProof, isYes);
        marketsTraded++;

        emit BetPlaced(vaultId, market, isYes);
    }

    /**
     * @notice Manager claims accumulated performance fees
     */
    function claimFees() external onlyManager nonReentrant {
        if (!FHE.isInitialized(_accruedFees)) revert NoFees();

        euint64 fees = _accruedFees;
        _accruedFees = FHE.asEuint64(uint64(0));
        FHE.allowThis(_accruedFees);

        FHE.allowTransient(fees, address(cUSDT));
        cUSDT.transfer(manager, fees);

        emit FeesClaimed(vaultId, manager);
    }

    /**
     * @notice Close vault and settle — no new deposits or bets.
     *         Followers can still withdraw their shares after close.
     */
    function closeVault() external onlyManager {
        closed = true;
        emit VaultSettled(vaultId);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    function getShares(address follower) external view returns (euint64) {
        return _shares[follower];
    }

    function getCostBasis(address follower) external view returns (euint64) {
        return _costBasis[follower];
    }

    function getTotalDepositsHandle() external view returns (bytes32) {
        if (!FHE.isInitialized(_totalShares)) return bytes32(0);
        // Total deposits is tracked via the vault's cUSDT balance
        // The handle for totalShares is what the keeper decrypts
        return FHE.toBytes32(_totalShares);
    }

    function isFollower(address account) external view returns (bool) {
        return _isFollower[account];
    }

    function getFollowers() external view returns (address[] memory) {
        return _followers;
    }

    /// @dev Public total shares (set by keeper after decrypt)
    uint256 public publicTotalShares;

    function setPublicTotalDeposits(uint256 value) external {
        if (msg.sender != factoryOwner) revert OnlyOwner();
        publicTotalDeposits = value;
    }

    function setPublicTotalShares(uint256 value) external {
        if (msg.sender != factoryOwner) revert OnlyOwner();
        publicTotalShares = value;
    }
}
