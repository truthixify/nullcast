// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IConfidentialERC20.sol";
import "./NullCastMarket.sol";

/**
 * @title StrategyVault
 * @notice Copy-trading vault where a manager places bets on behalf of followers.
 * @dev Manager must meet a reputation tier threshold. Followers deposit cUSDT,
 *      manager allocates across markets. Individual allocations are encrypted.
 *      Manager earns a performance fee on profits.
 */
contract StrategyVault is ZamaEthereumConfig, ReentrancyGuard {
    // ── Errors ─────────────────────────────────────────────────────────────

    error OnlyManager();
    error OnlyOwner();
    error ZeroAddress();
    error VaultClosed();
    error VaultNotClosed();
    error NoDeposit();
    error AlreadyWithdrawn();
    error InsufficientDeposit();

    // ── Events ─────────────────────────────────────────────────────────────

    event Deposit(address indexed follower, uint256 indexed vaultId);
    event Withdrawal(address indexed follower, uint256 indexed vaultId);
    event BetPlaced(uint256 indexed vaultId, address indexed market, bool isYes);
    event VaultClosed_(uint256 indexed vaultId);

    // ── State ──────────────────────────────────────────────────────────────

    uint256 public vaultId;
    string public name;
    string public description;
    address public manager;
    address public factoryOwner;
    uint8 public requiredTier; // minimum reputation threshold to manage
    uint8 public performanceFeeBps; // basis points (e.g. 1000 = 10%)

    IConfidentialERC20 public cUSDT;
    bool public closed;

    /// @dev Encrypted: total deposits in the vault
    euint64 private _totalDeposits;
    /// @dev Encrypted: individual follower deposits
    mapping(address => euint64) private _deposits;
    /// @dev Track followers
    address[] private _followers;
    mapping(address => bool) private _isFollower;
    mapping(address => bool) private _hasWithdrawn;

    /// @dev Publicly readable stats
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

    /**
     * @notice Create a new strategy vault
     * @param _vaultId Unique vault identifier
     * @param _name Vault display name
     * @param _description Strategy description
     * @param _manager Manager address (must meet tier threshold)
     * @param _requiredTier Minimum reputation tier to manage (e.g. 60 = Strategist)
     * @param _performanceFeeBps Performance fee in basis points (e.g. 1000 = 10%)
     * @param _cUSDT Confidential USDT contract address
     * @param _factoryOwner Protocol owner for admin operations
     */
    constructor(
        uint256 _vaultId,
        string memory _name,
        string memory _description,
        address _manager,
        uint8 _requiredTier,
        uint8 _performanceFeeBps,
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
     * @notice Deposit cUSDT into the vault as a follower
     * @param encryptedAmount Encrypted deposit amount
     * @param inputProof Proof for the encrypted input
     */
    function deposit(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyOpen nonReentrant {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        if (!_isFollower[msg.sender]) {
            _isFollower[msg.sender] = true;
            _followers.push(msg.sender);
            followerCount++;
        }

        if (FHE.isInitialized(_deposits[msg.sender])) {
            _deposits[msg.sender] = FHE.add(_deposits[msg.sender], amount);
        } else {
            _deposits[msg.sender] = amount;
        }
        FHE.allowThis(_deposits[msg.sender]);
        FHE.allow(_deposits[msg.sender], msg.sender);

        if (FHE.isInitialized(_totalDeposits)) {
            _totalDeposits = FHE.add(_totalDeposits, amount);
        } else {
            _totalDeposits = amount;
        }
        FHE.allowThis(_totalDeposits);
        FHE.makePubliclyDecryptable(_totalDeposits);

        FHE.allowTransient(amount, address(cUSDT));
        cUSDT.transferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, vaultId);
    }

    /**
     * @notice Withdraw deposit from a closed vault
     */
    function withdraw() external nonReentrant {
        if (!closed) revert VaultNotClosed();
        if (!_isFollower[msg.sender]) revert NoDeposit();
        if (_hasWithdrawn[msg.sender]) revert AlreadyWithdrawn();

        _hasWithdrawn[msg.sender] = true;

        euint64 amount = _deposits[msg.sender];
        if (!FHE.isInitialized(amount)) revert NoDeposit();

        FHE.allowTransient(amount, address(cUSDT));
        cUSDT.transfer(msg.sender, amount);

        emit Withdrawal(msg.sender, vaultId);
    }

    // ── Manager Functions ──────────────────────────────────────────────────

    /**
     * @notice Place a bet from the vault's funds on a market
     * @param market Address of the NullCastMarket contract
     * @param encryptedAmount Encrypted bet amount from vault funds
     * @param inputProof Proof for the encrypted input
     * @param isYes Bet direction
     */
    function placeBetFromVault(
        address market,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        bool isYes
    ) external onlyManager onlyOpen nonReentrant {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Approve the market to spend cUSDT from this vault
        FHE.allowTransient(amount, address(cUSDT));

        // The market's placeBet expects the vault to have approved cUSDT
        // We need to approve the market contract first
        euint64 approveAmount = amount;
        FHE.allowTransient(approveAmount, address(cUSDT));

        NullCastMarket(market).placeBet(encryptedAmount, inputProof, isYes);
        marketsTraded++;

        emit BetPlaced(vaultId, market, isYes);
    }

    /**
     * @notice Close the vault — stops new deposits and bets
     */
    function closeVault() external onlyManager {
        closed = true;
        emit VaultClosed_(vaultId);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Get the encrypted handle for a follower's deposit
     */
    function getDeposit(address follower) external view returns (euint64) {
        return _deposits[follower];
    }

    /**
     * @notice Get the encrypted handle for total deposits
     */
    function getTotalDepositsHandle() external view returns (bytes32) {
        return FHE.toBytes32(_totalDeposits);
    }

    /**
     * @notice Check if an address is a follower
     */
    function isFollower(address account) external view returns (bool) {
        return _isFollower[account];
    }

    /**
     * @notice Set publicly decrypted total deposits (called by keeper)
     */
    function setPublicTotalDeposits(uint256 value) external {
        if (msg.sender != factoryOwner) revert OnlyOwner();
        publicTotalDeposits = value;
    }
}
