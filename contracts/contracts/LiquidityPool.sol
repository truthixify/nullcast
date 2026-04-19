// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IConfidentialERC20.sol";

/**
 * @title LiquidityPool
 * @notice Bootstrap market liquidity and distribute fees to LPs
 * @dev LP shares are encrypted (euint64). Fee distribution is proportional
 *      to each LP's share of total liquidity. Paired 1:1 with a NullCastMarket.
 */
contract LiquidityPool is ZamaEthereumConfig, ReentrancyGuard {
    // ── Errors ─────────────────────────────────────────────────────────────

    error OnlyMarket();
    error OnlyOwner();
    error ZeroAddress();
    error NoShares();
    error MarketNotResolved();

    // ── Events ─────────────────────────────────────────────────────────────

    event LiquidityAdded(address indexed provider, uint256 indexed marketId);
    event LiquidityRemoved(address indexed provider, uint256 indexed marketId);
    event FeesDistributed(uint256 indexed marketId, uint256 blockNumber);

    // ── Encrypted State ────────────────────────────────────────────────────

    /// @dev Encrypted: total liquidity deposited by all LPs
    euint64 private _totalLiquidity;
    /// @dev Encrypted: individual LP share amounts — owner-only decrypt
    mapping(address => euint64) private _lpShares;
    /// @dev Encrypted: accumulated fees available for claim
    euint64 private _totalFees;
    /// @dev Encrypted: individual LP fee entitlements
    mapping(address => euint64) private _accruedFees;

    // ── Public State ───────────────────────────────────────────────────────

    uint256 public marketId;
    address public market;
    address public owner;
    IConfidentialERC20 public cUSDT;

    /// @dev Publicly decrypted total liquidity for display
    uint256 public publicTotalLiquidity;

    /// @dev Track LP addresses for fee distribution
    address[] private _lpAddresses;
    mapping(address => bool) private _isLP;

    bool public feesDistributed;

    // ── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyMarket() {
        if (msg.sender != market) revert OnlyMarket();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────

    /**
     * @notice Initialize a liquidity pool paired with a market
     * @param _marketId Market ID this pool is paired with
     * @param _market Address of the NullCastMarket contract
     * @param _owner Pool owner (usually the factory owner)
     * @param _cUSDT Address of the confidential USDT contract
     */
    constructor(
        uint256 _marketId,
        address _market,
        address _owner,
        address _cUSDT
    ) {
        if (_market == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        if (_cUSDT == address(0)) revert ZeroAddress();

        marketId = _marketId;
        market = _market;
        owner = _owner;
        cUSDT = IConfidentialERC20(_cUSDT);
    }

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Deposit cUSDT as liquidity
     * @param encryptedAmount Encrypted deposit amount
     * @param inputProof Proof that the encrypted input is valid
     */
    function addLiquidity(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external nonReentrant {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Track LP address
        if (!_isLP[msg.sender]) {
            _isLP[msg.sender] = true;
            _lpAddresses.push(msg.sender);
        }

        // Encrypted: update LP's share
        if (FHE.isInitialized(_lpShares[msg.sender])) {
            _lpShares[msg.sender] = FHE.add(_lpShares[msg.sender], amount);
        } else {
            _lpShares[msg.sender] = amount;
        }
        FHE.allowThis(_lpShares[msg.sender]);
        FHE.allow(_lpShares[msg.sender], msg.sender);

        // Encrypted: update total liquidity
        if (FHE.isInitialized(_totalLiquidity)) {
            _totalLiquidity = FHE.add(_totalLiquidity, amount);
        } else {
            _totalLiquidity = amount;
        }
        FHE.allowThis(_totalLiquidity);
        FHE.makePubliclyDecryptable(_totalLiquidity);

        // Transfer cUSDT from LP to this pool
        FHE.allowTransient(amount, address(cUSDT));
        cUSDT.transferFrom(msg.sender, address(this), amount);

        emit LiquidityAdded(msg.sender, marketId);
    }

    /**
     * @notice Receive fees from the market contract after resolution
     * @dev Called by the market contract. Stores the total fee for later distribution.
     * @param feeAmount Encrypted fee amount from the losing pool
     */
    function receiveFees(euint64 feeAmount) external onlyMarket {
        _totalFees = feeAmount;
        FHE.allowThis(_totalFees);

        emit FeesDistributed(marketId, block.number);
    }

    /**
     * @notice Claim accrued fees proportional to LP share
     * @dev Fee = (lpShare / totalLiquidity) * totalFees
     *      Uses publicTotalLiquidity (verified plaintext) for division.
     */
    function claimFees() external nonReentrant {
        if (!_isLP[msg.sender]) revert NoShares();
        if (!FHE.isInitialized(_totalFees)) revert NoShares();
        if (publicTotalLiquidity == 0) revert NoShares();

        euint64 lpShare = _lpShares[msg.sender];
        if (!FHE.isInitialized(lpShare)) revert NoShares();

        // Encrypted: fee = (lpShare * totalFees) / totalLiquidity
        euint64 numerator = FHE.mul(lpShare, _totalFees);
        euint64 fee = FHE.div(numerator, uint64(publicTotalLiquidity));

        _accruedFees[msg.sender] = fee;
        FHE.allowThis(_accruedFees[msg.sender]);
        FHE.allow(_accruedFees[msg.sender], msg.sender);

        // Transfer fee to LP
        FHE.allowTransient(fee, address(cUSDT));
        cUSDT.transfer(msg.sender, fee);
    }

    /**
     * @notice Withdraw LP principal after market resolution
     */
    function withdrawLiquidity() external nonReentrant {
        if (!_isLP[msg.sender]) revert NoShares();

        euint64 shares = _lpShares[msg.sender];
        if (!FHE.isInitialized(shares)) revert NoShares();

        // Zero out LP's shares
        _lpShares[msg.sender] = FHE.asEuint64(uint64(0));
        FHE.allowThis(_lpShares[msg.sender]);

        // Transfer principal back to LP
        FHE.allowTransient(shares, address(cUSDT));
        cUSDT.transfer(msg.sender, shares);

        emit LiquidityRemoved(msg.sender, marketId);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Get encrypted handle for an LP's share
     */
    function getLPShares(address provider) external view returns (euint64) {
        return _lpShares[provider];
    }

    /**
     * @notice Get encrypted handle for total liquidity
     */
    function getTotalLiquidityHandle() external view returns (bytes32) {
        return FHE.toBytes32(_totalLiquidity);
    }

    /**
     * @notice Get number of LP addresses
     */
    function getLPCount() external view returns (uint256) {
        return _lpAddresses.length;
    }

    /**
     * @notice Check if an address is an LP
     */
    function isLP(address account) external view returns (bool) {
        return _isLP[account];
    }

    /**
     * @notice Set publicly decrypted total liquidity
     * @dev Called after public decryption of _totalLiquidity handle
     */
    function setPublicTotalLiquidity(uint256 value) external onlyOwner {
        publicTotalLiquidity = value;
    }
}
