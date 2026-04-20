// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputationGate {
    function recordParticipation(address user) external;
    function hasScore(address user) external view returns (bool);
    function marketParticipation(address user) external view returns (uint256);
}
