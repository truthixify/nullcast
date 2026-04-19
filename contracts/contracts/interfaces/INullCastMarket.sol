// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

/**
 * @title INullCastMarket
 * @notice Interface for NullCastMarket used by Factory and Oracle
 */
interface INullCastMarket {
    enum MarketType { BINARY, SCALAR }
    enum MarketStatus { OPEN, EXPIRED, RESOLVING, RESOLVED, CANCELLED }

    function marketId() external view returns (uint256);
    function question() external view returns (string memory);
    function marketType() external view returns (MarketType);
    function status() external view returns (MarketStatus);
    function expiryBlock() external view returns (uint256);
    function oracle() external view returns (address);
    function resolveMarket(uint256 outcome) external;
    function getCurrentOdds() external view returns (uint256 yesOdds, uint256 noOdds);
    function hasPosition(address user) external view returns (bool);
}
