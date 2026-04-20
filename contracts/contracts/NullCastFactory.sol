// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./NullCastMarket.sol";
import "./LiquidityPool.sol";

/**
 * @title NullCastFactory
 * @notice Permissionless market creation and registry
 * @dev Deploys NullCastMarket instances via CREATE2 for deterministic addresses.
 *      Maintains a registry of all markets for frontend indexing.
 */
contract NullCastFactory is Ownable, Pausable {
    // ── Errors ─────────────────────────────────────────────────────────────

    error ExpiryInPast();
    error EmptyQuestion();
    error ZeroAddress();

    // ── Events ─────────────────────────────────────────────────────────────

    event MarketCreated(
        uint256 indexed marketId,
        address indexed marketAddress,
        address indexed creator,
        string question,
        uint256 expiryBlock
    );

    event LiquidityPoolCreated(uint256 indexed marketId, address indexed poolAddress);

    // ── State ──────────────────────────────────────────────────────────────

    address[] public allMarkets;
    mapping(uint256 => address) public marketById;
    mapping(uint256 => address) public liquidityPoolById;
    uint256 public marketCount;
    address public cUSDT;
    address public oracleAddress;
    address public reputationGate;

    // ── Constructor ────────────────────────────────────────────────────────

    /**
     * @notice Initialize the factory
     * @param _cUSDT Address of the confidential USDT contract
     * @param _oracle Default oracle address for new markets
     * @param _owner Factory owner with pause authority
     * @param _reputationGate Address of ReputationGate contract (address(0) for no gate)
     */
    constructor(
        address _cUSDT,
        address _oracle,
        address _owner,
        address _reputationGate
    ) Ownable(_owner) {
        if (_cUSDT == address(0)) revert ZeroAddress();
        if (_oracle == address(0)) revert ZeroAddress();

        cUSDT = _cUSDT;
        oracleAddress = _oracle;
        reputationGate = _reputationGate;
    }

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Create a new prediction market (binary or scalar) with a paired liquidity pool
     * @param question Human-readable market question
     * @param expiryBlock Block number after which no new bets are accepted
     * @param minimumBet Minimum bet amount in cUSDT base units (6 decimals)
     * @param _bucketCount Number of buckets for scalar markets (0 = binary)
     * @param _category Market category tag (e.g. keccak256("CRYPTO"))
     * @return marketAddress Address of the newly deployed market
     */
    function createMarket(
        string calldata question,
        uint256 expiryBlock,
        uint256 minimumBet,
        uint8 _bucketCount,
        bytes32 _category
    ) external whenNotPaused returns (address marketAddress) {
        if (bytes(question).length == 0) revert EmptyQuestion();
        if (expiryBlock <= block.number) revert ExpiryInPast();

        uint256 newMarketId = marketCount;
        marketCount++;

        bytes32 salt = keccak256(abi.encodePacked(newMarketId, msg.sender, block.number));

        NullCastMarket market = new NullCastMarket{salt: salt}(
            NullCastMarket.MarketParams({
                marketId: newMarketId,
                question: question,
                expiryBlock: expiryBlock,
                minimumBet: minimumBet,
                oracle: oracleAddress,
                owner: owner(),
                cUSDT: cUSDT,
                bucketCount: _bucketCount,
                reputationGate: reputationGate,
                category: _category
            })
        );

        marketAddress = address(market);
        allMarkets.push(marketAddress);
        marketById[newMarketId] = marketAddress;

        // Deploy a paired LiquidityPool for the market
        LiquidityPool pool = new LiquidityPool(
            newMarketId,
            marketAddress,
            owner(),
            cUSDT
        );
        liquidityPoolById[newMarketId] = address(pool);

        // Link the pool back to the market
        market.setLiquidityPool(address(pool));

        emit MarketCreated(newMarketId, marketAddress, msg.sender, question, expiryBlock);
        emit LiquidityPoolCreated(newMarketId, address(pool));
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Get a market address by ID
     */
    function getMarket(uint256 _marketId) external view returns (address) {
        return marketById[_marketId];
    }

    /**
     * @notice Get the liquidity pool address for a given market ID
     */
    function getLiquidityPool(uint256 _marketId) external view returns (address) {
        return liquidityPoolById[_marketId];
    }

    /**
     * @notice Get all market addresses
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    /**
     * @notice Get count of all markets created
     */
    function getMarketCount() external view returns (uint256) {
        return marketCount;
    }

    // ── Admin Functions ────────────────────────────────────────────────────

    /**
     * @notice Pause market creation
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause market creation
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Update the default oracle address for new markets
     * @param _oracle New oracle address
     */
    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        oracleAddress = _oracle;
    }

    /**
     * @notice Update the cUSDT address
     * @param _cUSDT New cUSDT address
     */
    function setCUSDT(address _cUSDT) external onlyOwner {
        if (_cUSDT == address(0)) revert ZeroAddress();
        cUSDT = _cUSDT;
    }

    /**
     * @notice Update the reputation gate address
     * @param _gate New ReputationGate address (address(0) to disable)
     */
    function setReputationGate(address _gate) external onlyOwner {
        reputationGate = _gate;
    }
}
