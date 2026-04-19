// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationGate
 * @notice Lightweight encrypted reputation score for access-gated markets
 * @dev Scores are encrypted (euint8, 0-100). Only the user can decrypt their own score.
 *      Markets check eligibility via meetsThreshold() which returns ebool — never the score.
 *      Scores decay over time to encourage ongoing participation.
 */
contract ReputationGate is ZamaEthereumConfig, Ownable {
    // ── Errors ─────────────────────────────────────────────────────────────

    error ScoreNotInitialized(address user);

    // ── Events ─────────────────────────────────────────────────────────────

    event ScoreComputed(address indexed user, uint256 blockNumber);
    event ScoreDecayed(address indexed user, uint256 blockNumber);

    // ── Constants ──────────────────────────────────────────────────────────

    /// @dev Score decays every ~7 days of inactivity (based on ~12s blocks)
    uint256 public constant DECAY_BLOCKS = 50400;
    /// @dev Lose 5 points per decay period
    uint8 public constant DECAY_RATE = 5;

    // ── Encrypted State ────────────────────────────────────────────────────

    /// @dev Encrypted: individual reputation scores — owner-only decrypt
    mapping(address => euint8) private _scores;
    /// @dev Last block the score was updated
    mapping(address => uint256) private _lastUpdated;

    // ── Public State ───────────────────────────────────────────────────────

    /// @dev Track NullCast market participation count per user
    mapping(address => uint256) public marketParticipation;

    // ── Constructor ────────────────────────────────────────────────────────

    constructor(address _owner) Ownable(_owner) {}

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Compute and store a reputation score for a user
     * @dev Score = walletAge (max 40) + txProxy (max 40) + history (max 20)
     *      For Sepolia demo, walletAge and txCount are passed as params
     *      since we can't look them up on-chain.
     * @param user Address to compute score for
     * @param walletAgeBlocks Wallet age in blocks (from first tx)
     * @param txCount Total transaction count (capped at 1000)
     */
    function computeScore(
        address user,
        uint256 walletAgeBlocks,
        uint256 txCount
    ) external onlyOwner {
        // Cap inputs and compute sub-scores
        uint8 ageScore = uint8(_min(walletAgeBlocks / 1000, 40));    // max 40pts
        uint8 txScore = uint8(_min(txCount / 25, 40));               // max 40pts
        uint8 histScore = uint8(_min(marketParticipation[user] * 2, 20)); // max 20pts

        // Encrypted: encrypt all sub-scores and sum
        euint8 encAge = FHE.asEuint8(ageScore);
        euint8 encTx = FHE.asEuint8(txScore);
        euint8 encHist = FHE.asEuint8(histScore);

        euint8 totalScore = FHE.add(FHE.add(encAge, encTx), encHist);

        _scores[user] = totalScore;
        _lastUpdated[user] = block.number;

        // ACL: grant contract + user permission
        FHE.allowThis(_scores[user]);
        FHE.allow(_scores[user], user);

        emit ScoreComputed(user, block.number);
    }

    /**
     * @notice Check if user meets minimum threshold for a market
     * @dev Returns ebool — only yes/no, never the actual score
     * @param user Address to check
     * @param threshold Minimum score required (0-100)
     * @return qualified Encrypted boolean result
     */
    function meetsThreshold(address user, uint8 threshold) external returns (ebool) {
        euint8 score = _applyDecay(user);
        ebool qualified = FHE.ge(score, FHE.asEuint8(threshold));
        FHE.allowThis(qualified);
        return qualified;
    }

    /**
     * @notice Increment a user's NullCast market participation count
     * @dev Called by market contracts when a user places a bet
     * @param user Address whose participation to increment
     */
    function recordParticipation(address user) external {
        marketParticipation[user]++;
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Get the encrypted handle for a user's score
     * @dev Only the user themselves can decrypt this via KMS
     */
    function getUserScore(address user) external view returns (euint8) {
        return _scores[user];
    }

    /**
     * @notice Check if a user has a computed score
     */
    function hasScore(address user) external view returns (bool) {
        return FHE.isInitialized(_scores[user]);
    }

    /**
     * @notice Get the block number of the last score update
     */
    function getLastUpdated(address user) external view returns (uint256) {
        return _lastUpdated[user];
    }

    // ── Internal Helpers ───────────────────────────────────────────────────

    /**
     * @notice Apply time-based score decay
     * @dev Uses FHE.select to safely handle underflow:
     *      if score < decayAmount, return 0 instead of reverting
     */
    function _applyDecay(address user) internal returns (euint8) {
        if (!FHE.isInitialized(_scores[user])) {
            return FHE.asEuint8(0);
        }

        uint256 blocksSinceUpdate = block.number - _lastUpdated[user];
        uint256 decayPeriods = blocksSinceUpdate / DECAY_BLOCKS;

        if (decayPeriods == 0) return _scores[user];

        uint8 totalDecay = uint8(_min(decayPeriods * DECAY_RATE, 100));
        euint8 decayAmount = FHE.asEuint8(totalDecay);

        // Encrypted: if score < decay, return 0 (prevent underflow)
        ebool wouldUnderflow = FHE.lt(_scores[user], decayAmount);
        euint8 decayed = FHE.select(
            wouldUnderflow,
            FHE.asEuint8(0),
            FHE.sub(_scores[user], decayAmount)
        );

        FHE.allowThis(decayed);
        FHE.allow(decayed, user);

        emit ScoreDecayed(user, block.number);

        return decayed;
    }

    /**
     * @dev Safe min helper for uint256
     */
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
