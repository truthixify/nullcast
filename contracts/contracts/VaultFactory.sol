// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StrategyVault.sol";

/**
 * @title VaultFactory
 * @notice Deploy and register strategy vaults for copy-trading
 */
contract VaultFactory is Ownable {
    // ── Errors ─────────────────────────────────────────────────────────────

    error ZeroAddress();
    error EmptyName();

    // ── Events ─────────────────────────────────────────────────────────────

    event VaultCreated(
        uint256 indexed vaultId,
        address indexed vaultAddress,
        address indexed manager,
        string name
    );

    // ── State ──────────────────────────────────────────────────────────────

    address[] public allVaults;
    mapping(uint256 => address) public vaultById;
    uint256 public vaultCount;
    address public cUSDT;

    // ── Constructor ────────────────────────────────────────────────────────

    constructor(address _cUSDT, address _owner) Ownable(_owner) {
        if (_cUSDT == address(0)) revert ZeroAddress();
        cUSDT = _cUSDT;
    }

    // ── Core Functions ─────────────────────────────────────────────────────

    /**
     * @notice Create a new strategy vault
     * @param name_ Vault display name
     * @param description_ Strategy description
     * @param requiredTier Minimum reputation tier to manage
     * @param performanceFeeBps Performance fee in basis points
     * @return vaultAddress Address of the deployed vault
     */
    function createVault(
        string calldata name_,
        string calldata description_,
        uint8 requiredTier,
        uint16 performanceFeeBps
    ) external returns (address vaultAddress) {
        if (bytes(name_).length == 0) revert EmptyName();

        uint256 newVaultId = vaultCount;
        vaultCount++;

        StrategyVault vault = new StrategyVault(
            newVaultId,
            name_,
            description_,
            msg.sender,
            requiredTier,
            performanceFeeBps,
            cUSDT,
            owner()
        );

        vaultAddress = address(vault);
        allVaults.push(vaultAddress);
        vaultById[newVaultId] = vaultAddress;

        emit VaultCreated(newVaultId, vaultAddress, msg.sender, name_);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    function getVault(uint256 id) external view returns (address) {
        return vaultById[id];
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function getVaultCount() external view returns (uint256) {
        return vaultCount;
    }
}
