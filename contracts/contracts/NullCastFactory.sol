// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./NullCastMarket.sol";

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

    // ── State ──────────────────────────────────────────────────────────────

    address[] public allMarkets;
    mapping(uint256 => address) public marketById;
    uint256 public marketCount;
    address public cUSDT;
    address public oracleAddress;

    // ── Constructor ────────────────────────────────────────────────────────

    /**
     * @notice Initialize the factory
     * @param _cUSDT Address of the confidential USDT contract
     * @param _oracle Default oracle address for new markets
     * @param _owner Factory owner with pause authority
     */
    constructor(
        address _cUSDT,
        address _oracle,
        address _owner
    ) Ownable(_owner) {
        if (_cUSDT == address(0)) revert ZeroAddress();
        if (_oracle == address(0)) revert ZeroAddress();

        cUSDT = _cUSDT;
        oracleAddress = _oracle;
    }

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Create a new binary prediction market
     * @param question Human-readable market question
     * @param expiryBlock Block number after which no new bets are accepted
     * @param minimumBet Minimum bet amount in cUSDT base units (6 decimals)
     * @return marketAddress Address of the newly deployed market
     */
    function createMarket(
        string calldata question,
        uint256 expiryBlock,
        uint256 minimumBet
    ) external whenNotPaused returns (address marketAddress) {
        if (bytes(question).length == 0) revert EmptyQuestion();
        if (expiryBlock <= block.number) revert ExpiryInPast();

        uint256 newMarketId = marketCount;
        marketCount++;

        // Deploy market via CREATE2 for deterministic address
        bytes32 salt = keccak256(abi.encodePacked(newMarketId, msg.sender, block.number));

        NullCastMarket market = new NullCastMarket{salt: salt}(
            newMarketId,
            question,
            expiryBlock,
            minimumBet,
            oracleAddress,
            owner(),
            cUSDT
        );

        marketAddress = address(market);
        allMarkets.push(marketAddress);
        marketById[newMarketId] = marketAddress;

        emit MarketCreated(newMarketId, marketAddress, msg.sender, question, expiryBlock);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Get a market address by ID
     */
    function getMarket(uint256 _marketId) external view returns (address) {
        return marketById[_marketId];
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
}
