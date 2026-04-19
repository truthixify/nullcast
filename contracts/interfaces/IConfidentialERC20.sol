// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

/**
 * @title IConfidentialERC20
 * @notice Interface for ERC-7984 compatible confidential tokens (e.g. cUSDT)
 */
interface IConfidentialERC20 {
    function transfer(address to, euint64 amount) external returns (bool);
    function transferFrom(address from, address to, euint64 amount) external returns (bool);
    function approve(address spender, externalEuint64 encryptedAmount, bytes calldata inputProof) external returns (bool);
    function balanceOf(address account) external view returns (euint64);
    function totalSupply() external view returns (euint64);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}
