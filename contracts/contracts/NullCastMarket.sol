// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IConfidentialERC20.sol";

/**
 * @title NullCastMarket
 * @notice Core FHE prediction market — binary betting with encrypted positions
 * @dev Individual positions are private (euint64). Aggregate pool totals are
 *      publicly decryptable for odds display. Uses Zama FHEVM ACL model.
 */
contract NullCastMarket is ZamaEthereumConfig, Pausable, ReentrancyGuard {
    // ── Types ──────────────────────────────────────────────────────────────

    enum MarketType {
        BINARY,
        SCALAR
    }

    enum MarketStatus {
        OPEN,
        EXPIRED,
        RESOLVING,
        RESOLVED,
        CANCELLED
    }

    // ── Errors ─────────────────────────────────────────────────────────────

    error MarketNotOpen(MarketStatus current);
    error MarketNotExpired();
    error MarketNotResolved(MarketStatus current);
    error MarketAlreadyResolved();
    error OnlyOracle();
    error OnlyOwner();
    error OnlyFactory();
    error BetBelowMinimum();
    error NoPosition();
    error AlreadyClaimed();
    error OddsAlreadyUpdatedThisBlock();
    error ZeroAddress();
    error NotScalarMarket();
    error NotBinaryMarket();
    error InvalidBucketId(uint8 bucketId, uint8 bucketCount);

    // ── Events ─────────────────────────────────────────────────────────────

    event BetPlaced(address indexed bettor, uint256 indexed marketId, bool isYes);
    event BucketBetPlaced(address indexed bettor, uint256 indexed marketId, uint8 bucketId);
    event OddsUpdated(uint256 indexed marketId, uint256 yesPool, uint256 noPool, uint256 blockNumber);
    event MarketResolved(uint256 indexed marketId, uint256 outcome, uint256 blockNumber);
    event WinningsClaimed(address indexed winner, uint256 indexed marketId);
    event MarketExpired(uint256 indexed marketId, uint256 blockNumber);
    event MarketCancelled(uint256 indexed marketId, string reason);

    // ── Encrypted State ────────────────────────────────────────────────────

    /// @dev Encrypted: aggregate YES pool — publicly decryptable for odds
    euint64 private _totalYesPool;
    /// @dev Encrypted: aggregate NO pool — publicly decryptable for odds
    euint64 private _totalNoPool;

    /// @dev Encrypted: individual bet amounts must never be publicly visible
    /// to prevent whale tracking and front-running
    mapping(address => euint64) private _userYesPositions;
    mapping(address => euint64) private _userNoPositions;

    /// @dev Encrypted: individual payout amounts — owner-only decrypt
    mapping(address => euint64) private _userWinnings;

    // ── Scalar Market Encrypted State ──────────────────────────────────────

    /// @dev Encrypted: per-bucket pool totals (bucketId => encrypted pool)
    mapping(uint8 => euint64) private _bucketPools;
    /// @dev Encrypted: per-user per-bucket positions
    mapping(address => mapping(uint8 => euint64)) private _userBucketPositions;

    /// @dev Tracks whether a user has already claimed winnings
    mapping(address => bool) private _hasClaimed;

    /// @dev Tracks whether a user has placed any bet
    mapping(address => bool) private _hasPosition;

    // ── Public State ───────────────────────────────────────────────────────

    uint256 public marketId;
    string public question;
    MarketType public marketType;
    MarketStatus public status;
    uint256 public expiryBlock;
    uint256 public minimumBet;
    uint256 public lastOddsUpdate;

    /// @dev Publicly revealed after async decryption via submitOddsUpdate
    uint256 public publicYesPool;
    uint256 public publicNoPool;

    /// @dev Publicly revealed bucket pool totals (scalar markets)
    mapping(uint8 => uint256) public publicBucketPools;
    /// @dev Number of buckets for scalar markets
    uint8 public bucketCount;

    /// @dev Resolution state
    uint256 public resolvedOutcome; // 0 = NO/bucket0, 1 = YES/bucket1, etc.
    address public oracle;
    address public owner;
    address public factory;

    /// @dev cUSDT token used for betting
    IConfidentialERC20 public cUSDT;

    // ── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyOpen() {
        if (status != MarketStatus.OPEN) revert MarketNotOpen(status);
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert OnlyOracle();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    modifier onlyResolved() {
        if (status != MarketStatus.RESOLVED) revert MarketNotResolved(status);
        _;
    }

    modifier oncePerBlock() {
        if (block.number <= lastOddsUpdate) revert OddsAlreadyUpdatedThisBlock();
        _;
    }

    modifier onlyBinary() {
        if (marketType != MarketType.BINARY) revert NotBinaryMarket();
        _;
    }

    modifier onlyScalar() {
        if (marketType != MarketType.SCALAR) revert NotScalarMarket();
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────

    /**
     * @notice Initialize a new binary prediction market
     * @param _marketId Unique identifier assigned by the factory
     * @param _question Human-readable market question
     * @param _expiryBlock Block number after which no new bets are accepted
     * @param _minimumBet Minimum bet amount in cUSDT base units (6 decimals)
     * @param _oracle Address authorized to resolve this market
     * @param _owner Address with pause/cancel authority
     * @param _cUSDT Address of the confidential USDT contract
     */
    /**
     * @param _marketId Unique identifier assigned by the factory
     * @param _question Human-readable market question
     * @param _expiryBlock Block number after which no new bets are accepted
     * @param _minimumBet Minimum bet amount in cUSDT base units (6 decimals)
     * @param _oracle Address authorized to resolve this market
     * @param _owner Address with pause/cancel authority
     * @param _cUSDT Address of the confidential USDT contract
     * @param _bucketCount Number of buckets for scalar markets (0 = binary)
     */
    constructor(
        uint256 _marketId,
        string memory _question,
        uint256 _expiryBlock,
        uint256 _minimumBet,
        address _oracle,
        address _owner,
        address _cUSDT,
        uint8 _bucketCount
    ) {
        if (_oracle == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        if (_cUSDT == address(0)) revert ZeroAddress();

        marketId = _marketId;
        question = _question;
        status = MarketStatus.OPEN;
        expiryBlock = _expiryBlock;
        minimumBet = _minimumBet;
        oracle = _oracle;
        owner = _owner;
        factory = msg.sender;
        cUSDT = IConfidentialERC20(_cUSDT);

        if (_bucketCount > 0) {
            marketType = MarketType.SCALAR;
            bucketCount = _bucketCount;
        } else {
            marketType = MarketType.BINARY;
        }
    }

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Place an encrypted binary bet
     * @dev Encrypted amount is verified against minimumBet via FHE comparison.
     *      If amount < minimumBet, the effective bet is zeroed out (no revert on
     *      encrypted values — we use FHE.select to enforce the minimum).
     * @param encryptedAmount Encrypted bet amount (externalEuint64 handle)
     * @param inputProof Proof that the encrypted input is valid
     * @param isYes True for YES bet, false for NO bet
     */
    function placeBet(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        bool isYes
    ) external whenNotPaused onlyOpen nonReentrant {
        // Check market hasn't expired
        if (block.number >= expiryBlock) {
            status = MarketStatus.EXPIRED;
            emit MarketExpired(marketId, block.number);
            revert MarketNotOpen(MarketStatus.EXPIRED);
        }

        // Decrypt input into local encrypted handle
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Encrypted: verify minimum bet via ciphertext comparison
        // If amount < minimumBet, zero it out so the transfer is effectively nothing
        ebool meetsMinimum = FHE.ge(amount, FHE.asEuint64(uint64(minimumBet)));
        euint64 validAmount = FHE.select(meetsMinimum, amount, FHE.asEuint64(uint64(0)));

        // Allow the cUSDT contract to use this handle for transferFrom
        FHE.allowTransient(validAmount, address(cUSDT));

        // Transfer cUSDT from user to this contract
        cUSDT.transferFrom(msg.sender, address(this), validAmount);

        // Track user's position
        _hasPosition[msg.sender] = true;

        if (isYes) {
            // Encrypted: add to user's YES position
            if (FHE.isInitialized(_userYesPositions[msg.sender])) {
                _userYesPositions[msg.sender] = FHE.add(
                    _userYesPositions[msg.sender],
                    validAmount
                );
            } else {
                _userYesPositions[msg.sender] = validAmount;
            }

            // Encrypted: add to total YES pool
            if (FHE.isInitialized(_totalYesPool)) {
                _totalYesPool = FHE.add(_totalYesPool, validAmount);
            } else {
                _totalYesPool = validAmount;
            }

            // ACL: grant contract + user permission to compute on / decrypt position
            FHE.allowThis(_userYesPositions[msg.sender]);
            FHE.allow(_userYesPositions[msg.sender], msg.sender);
        } else {
            if (FHE.isInitialized(_userNoPositions[msg.sender])) {
                _userNoPositions[msg.sender] = FHE.add(
                    _userNoPositions[msg.sender],
                    validAmount
                );
            } else {
                _userNoPositions[msg.sender] = validAmount;
            }

            if (FHE.isInitialized(_totalNoPool)) {
                _totalNoPool = FHE.add(_totalNoPool, validAmount);
            } else {
                _totalNoPool = validAmount;
            }

            FHE.allowThis(_userNoPositions[msg.sender]);
            FHE.allow(_userNoPositions[msg.sender], msg.sender);
        }

        // Mark pool totals for public decryption (batched once per block)
        _markPoolsPubliclyDecryptable();

        // ACL for pool totals — contract must be able to compute on them
        FHE.allowThis(_totalYesPool);
        FHE.allowThis(_totalNoPool);

        emit BetPlaced(msg.sender, marketId, isYes);
    }

    /**
     * @notice Place an encrypted scalar bet on a specific bucket
     * @param encryptedAmount Encrypted bet amount (externalEuint64 handle)
     * @param inputProof Proof that the encrypted input is valid
     * @param bucketId Bucket index to bet on (0 to bucketCount-1)
     */
    function placeBucketBet(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        uint8 bucketId
    ) external whenNotPaused onlyOpen onlyScalar nonReentrant {
        if (bucketId >= bucketCount) revert InvalidBucketId(bucketId, bucketCount);

        if (block.number >= expiryBlock) {
            status = MarketStatus.EXPIRED;
            emit MarketExpired(marketId, block.number);
            revert MarketNotOpen(MarketStatus.EXPIRED);
        }

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Encrypted: enforce minimum bet
        ebool meetsMinimum = FHE.ge(amount, FHE.asEuint64(uint64(minimumBet)));
        euint64 validAmount = FHE.select(meetsMinimum, amount, FHE.asEuint64(uint64(0)));

        FHE.allowTransient(validAmount, address(cUSDT));
        cUSDT.transferFrom(msg.sender, address(this), validAmount);

        _hasPosition[msg.sender] = true;

        // Encrypted: update user's bucket position
        if (FHE.isInitialized(_userBucketPositions[msg.sender][bucketId])) {
            _userBucketPositions[msg.sender][bucketId] = FHE.add(
                _userBucketPositions[msg.sender][bucketId],
                validAmount
            );
        } else {
            _userBucketPositions[msg.sender][bucketId] = validAmount;
        }
        FHE.allowThis(_userBucketPositions[msg.sender][bucketId]);
        FHE.allow(_userBucketPositions[msg.sender][bucketId], msg.sender);

        // Encrypted: update bucket pool total
        if (FHE.isInitialized(_bucketPools[bucketId])) {
            _bucketPools[bucketId] = FHE.add(_bucketPools[bucketId], validAmount);
        } else {
            _bucketPools[bucketId] = validAmount;
        }
        FHE.allowThis(_bucketPools[bucketId]);
        FHE.makePubliclyDecryptable(_bucketPools[bucketId]);

        emit BucketBetPlaced(msg.sender, marketId, bucketId);
    }

    /**
     * @notice Submit publicly decrypted odds back on-chain
     * @dev Called by frontend/keeper after off-chain decryption via Zama KMS.
     *      Verifies the decryption proof before storing plaintext pool values.
     * @param clearYes Decrypted YES pool total
     * @param clearNo Decrypted NO pool total
     * @param decryptionProof KMS signature proving decryption is valid
     */
    function submitOddsUpdate(
        uint256 clearYes,
        uint256 clearNo,
        bytes memory decryptionProof
    ) external oncePerBlock {
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(_totalYesPool);
        handles[1] = FHE.toBytes32(_totalNoPool);

        bytes memory abiEncoded = abi.encode(clearYes, clearNo);
        FHE.checkSignatures(handles, abiEncoded, decryptionProof);

        publicYesPool = clearYes;
        publicNoPool = clearNo;
        lastOddsUpdate = block.number;

        emit OddsUpdated(marketId, clearYes, clearNo, block.number);
    }

    /**
     * @notice Resolve the market with the oracle's outcome
     * @dev Only callable by the designated oracle after the market has expired.
     * @param outcome 0 = NO wins, 1 = YES wins
     */
    function resolveMarket(uint256 outcome) external onlyOracle {
        if (status == MarketStatus.RESOLVED) revert MarketAlreadyResolved();
        if (block.number < expiryBlock) revert MarketNotExpired();

        status = MarketStatus.RESOLVED;
        resolvedOutcome = outcome;

        emit MarketResolved(marketId, outcome, block.number);
    }

    /**
     * @notice Compute and claim winnings after market resolution
     * @dev Computes winner's proportional share over encrypted positions:
     *      winnings = (userPosition * totalPool) / totalWinnerPool
     *      Deducts 2% LP fee. Transfers net winnings in cUSDT.
     */
    function claimWinnings() external onlyResolved nonReentrant {
        if (!_hasPosition[msg.sender]) revert NoPosition();
        if (_hasClaimed[msg.sender]) revert AlreadyClaimed();

        _hasClaimed[msg.sender] = true;

        euint64 netWinnings;

        if (marketType == MarketType.BINARY) {
            netWinnings = _claimBinaryWinnings();
        } else {
            netWinnings = _claimScalarWinnings();
        }

        // Store winnings and grant user decrypt permission
        _userWinnings[msg.sender] = netWinnings;
        FHE.allowThis(_userWinnings[msg.sender]);
        FHE.allow(_userWinnings[msg.sender], msg.sender);

        // Allow the cUSDT contract to use this handle for transfer
        FHE.allowTransient(netWinnings, address(cUSDT));

        // Transfer cUSDT to winner (encrypted transfer)
        cUSDT.transfer(msg.sender, netWinnings);

        emit WinningsClaimed(msg.sender, marketId);
    }

    // ── Admin Functions ────────────────────────────────────────────────────

    /**
     * @notice Pause the market — prevents new bets
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the market
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Cancel the market — only when paused
     * @param reason Human-readable cancellation reason
     */
    function cancelMarket(string calldata reason) external onlyOwner {
        _pause();
        status = MarketStatus.CANCELLED;
        emit MarketCancelled(marketId, reason);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Get current market odds based on last public decryption
     * @return yesOdds YES probability as percentage (0-100)
     * @return noOdds NO probability as percentage (0-100)
     */
    function getCurrentOdds() external view returns (uint256 yesOdds, uint256 noOdds) {
        uint256 total = publicYesPool + publicNoPool;
        if (total == 0) return (50, 50);
        yesOdds = (publicYesPool * 100) / total;
        noOdds = 100 - yesOdds;
    }

    /**
     * @notice Get the encrypted handle for a user's YES position
     * @dev Only the user themselves can decrypt this via KMS
     */
    function getUserYesPosition(address user) external view returns (euint64) {
        return _userYesPositions[user];
    }

    /**
     * @notice Get the encrypted handle for a user's NO position
     */
    function getUserNoPosition(address user) external view returns (euint64) {
        return _userNoPositions[user];
    }

    /**
     * @notice Get the encrypted handle for a user's computed winnings
     */
    function getUserWinnings(address user) external view returns (euint64) {
        return _userWinnings[user];
    }

    /**
     * @notice Get the encrypted handle for the total YES pool
     */
    function getTotalYesPoolHandle() external view returns (bytes32) {
        return FHE.toBytes32(_totalYesPool);
    }

    /**
     * @notice Get the encrypted handle for the total NO pool
     */
    function getTotalNoPoolHandle() external view returns (bytes32) {
        return FHE.toBytes32(_totalNoPool);
    }

    /**
     * @notice Check if a user has a position in this market
     */
    function hasPosition(address user) external view returns (bool) {
        return _hasPosition[user];
    }

    /**
     * @notice Check if a user has claimed winnings
     */
    function hasClaimed(address user) external view returns (bool) {
        return _hasClaimed[user];
    }

    /**
     * @notice Get the encrypted handle for a bucket pool (scalar markets)
     */
    function getBucketPoolHandle(uint8 bucketId) external view returns (bytes32) {
        return FHE.toBytes32(_bucketPools[bucketId]);
    }

    /**
     * @notice Get the encrypted handle for a user's bucket position
     */
    function getUserBucketPosition(address user, uint8 bucketId) external view returns (euint64) {
        return _userBucketPositions[user][bucketId];
    }

    // ── Internal Helpers ───────────────────────────────────────────────────

    /**
     * @dev Mark pool totals as publicly decryptable for odds display.
     *      Silently skips if already called this block (batch reveal).
     */
    function _markPoolsPubliclyDecryptable() internal {
        if (block.number <= lastOddsUpdate) return;

        if (FHE.isInitialized(_totalYesPool)) {
            FHE.makePubliclyDecryptable(_totalYesPool);
        }
        if (FHE.isInitialized(_totalNoPool)) {
            FHE.makePubliclyDecryptable(_totalNoPool);
        }
    }

    /**
     * @dev Binary market winnings: (userPosition * totalPool) / winnerPool - 2% fee
     */
    function _claimBinaryWinnings() internal returns (euint64) {
        euint64 userPosition;
        if (resolvedOutcome == 1) {
            userPosition = _userYesPositions[msg.sender];
        } else {
            userPosition = _userNoPositions[msg.sender];
        }

        if (!FHE.isInitialized(userPosition)) revert NoPosition();

        euint64 totalPool = FHE.add(_totalYesPool, _totalNoPool);

        uint64 winnerPoolClear = resolvedOutcome == 1
            ? uint64(publicYesPool)
            : uint64(publicNoPool);

        if (winnerPoolClear == 0) revert NoPosition();

        euint64 numerator = FHE.mul(userPosition, totalPool);
        euint64 grossWinnings = FHE.div(numerator, winnerPoolClear);

        euint64 fee = FHE.div(grossWinnings, uint64(50));
        return FHE.sub(grossWinnings, fee);
    }

    /**
     * @dev Scalar market winnings: (userBucketPosition * totalPool) / winnerBucketPool - 2% fee
     */
    function _claimScalarWinnings() internal returns (euint64) {
        uint8 winningBucket = uint8(resolvedOutcome);
        euint64 userPosition = _userBucketPositions[msg.sender][winningBucket];

        if (!FHE.isInitialized(userPosition)) revert NoPosition();

        // Compute total pool across all buckets
        euint64 totalPool = _bucketPools[0];
        for (uint8 i = 1; i < bucketCount; i++) {
            if (FHE.isInitialized(_bucketPools[i])) {
                totalPool = FHE.add(totalPool, _bucketPools[i]);
            }
        }

        uint64 winnerPoolClear = uint64(publicBucketPools[winningBucket]);
        if (winnerPoolClear == 0) revert NoPosition();

        euint64 numerator = FHE.mul(userPosition, totalPool);
        euint64 grossWinnings = FHE.div(numerator, winnerPoolClear);

        euint64 fee = FHE.div(grossWinnings, uint64(50));
        return FHE.sub(grossWinnings, fee);
    }
}
