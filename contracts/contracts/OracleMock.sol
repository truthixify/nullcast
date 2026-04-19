// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/INullCastMarket.sol";

/**
 * @title OracleMock
 * @notice Simulated price feed resolver for Sepolia demo
 * @dev Controlled by a designated EOA. In production, replaced by a
 *      decentralized oracle (Chainlink, UMA, Pyth) or multi-sig committee.
 */
contract OracleMock is Ownable {
    // ── Errors ─────────────────────────────────────────────────────────────

    error MarketNotRegistered(uint256 marketId);
    error MarketAlreadyRegistered(uint256 marketId);
    error ZeroAddress();

    // ── Events ─────────────────────────────────────────────────────────────

    event MarketResolutionSubmitted(
        uint256 indexed marketId,
        uint256 outcome,
        uint256 price,
        uint256 blockNumber
    );
    event MarketRegistered(uint256 indexed marketId, address indexed marketAddress);

    // ── State ──────────────────────────────────────────────────────────────

    mapping(uint256 => address) public marketRegistry;
    mapping(uint256 => uint256) public marketResolutions;
    mapping(uint256 => uint256) public priceAtResolution;
    mapping(uint256 => bool) public isResolved;

    // ── Constructor ────────────────────────────────────────────────────────

    constructor(address _owner) Ownable(_owner) {}

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Register a market address for this oracle to resolve
     * @param marketId The market ID to register
     * @param marketAddress The deployed market contract address
     */
    function registerMarket(uint256 marketId, address marketAddress) external onlyOwner {
        if (marketAddress == address(0)) revert ZeroAddress();
        if (marketRegistry[marketId] != address(0)) revert MarketAlreadyRegistered(marketId);

        marketRegistry[marketId] = marketAddress;

        emit MarketRegistered(marketId, marketAddress);
    }

    /**
     * @notice Submit resolution for a market
     * @dev Calls resolveMarket on the registered NullCastMarket contract
     * @param marketId The market to resolve
     * @param outcome 0 = NO wins, 1 = YES wins (binary) or bucket index (scalar)
     * @param price The reference price used for resolution
     */
    function submitResolution(
        uint256 marketId,
        uint256 outcome,
        uint256 price
    ) external onlyOwner {
        address marketAddress = marketRegistry[marketId];
        if (marketAddress == address(0)) revert MarketNotRegistered(marketId);

        marketResolutions[marketId] = outcome;
        priceAtResolution[marketId] = price;
        isResolved[marketId] = true;

        INullCastMarket(marketAddress).resolveMarket(outcome);

        emit MarketResolutionSubmitted(marketId, outcome, price, block.number);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    /**
     * @notice Get the resolution outcome and price for a market
     */
    function getResolution(uint256 marketId) external view returns (uint256 outcome, uint256 price) {
        outcome = marketResolutions[marketId];
        price = priceAtResolution[marketId];
    }
}
