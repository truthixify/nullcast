// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "../interfaces/IConfidentialERC20.sol";

/**
 * @title MockcUSDT
 * @notice Minimal confidential ERC-20 (ERC-7984) for local testing
 * @dev Uses euint64 balances with FHE ACL. Not production-safe.
 */
contract MockcUSDT is ZamaEthereumConfig, IConfidentialERC20 {
    mapping(address => euint64) private _balances;
    mapping(address => mapping(address => euint64)) private _allowances;
    euint64 private _totalSupply;

    string private constant _name = "Confidential USDT";
    string private constant _symbol = "cUSDT";
    uint8 private constant _decimals = 6;

    error InsufficientBalance();
    error InsufficientAllowance();

    function name() external pure override returns (string memory) {
        return _name;
    }

    function symbol() external pure override returns (string memory) {
        return _symbol;
    }

    function decimals() external pure override returns (uint8) {
        return _decimals;
    }

    function totalSupply() external view override returns (euint64) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (euint64) {
        return _balances[account];
    }

    /**
     * @notice Mint encrypted tokens to an address (test-only)
     * @param to Recipient address
     * @param amount Plaintext amount to mint (will be trivially encrypted)
     */
    function mint(address to, uint64 amount) external {
        euint64 encAmount = FHE.asEuint64(amount);
        FHE.allowThis(encAmount);

        if (FHE.isInitialized(_balances[to])) {
            _balances[to] = FHE.add(_balances[to], encAmount);
        } else {
            _balances[to] = encAmount;
        }
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);

        if (FHE.isInitialized(_totalSupply)) {
            _totalSupply = FHE.add(_totalSupply, encAmount);
        } else {
            _totalSupply = encAmount;
        }
        FHE.allowThis(_totalSupply);
    }

    function approve(address spender, externalEuint64 encryptedAmount, bytes calldata inputProof) external override returns (bool) {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _allowances[msg.sender][spender] = amount;
        FHE.allowThis(_allowances[msg.sender][spender]);
        FHE.allow(_allowances[msg.sender][spender], spender);
        return true;
    }

    function transfer(address to, euint64 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, euint64 amount) external override returns (bool) {
        euint64 currentAllowance = _allowances[from][msg.sender];

        // Deduct allowance: encrypted subtraction (underflow handled by FHE mock)
        _allowances[from][msg.sender] = FHE.sub(currentAllowance, amount);
        FHE.allowThis(_allowances[from][msg.sender]);
        FHE.allow(_allowances[from][msg.sender], msg.sender);

        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, euint64 amount) internal {
        _balances[from] = FHE.sub(_balances[from], amount);
        FHE.allowThis(_balances[from]);
        FHE.allow(_balances[from], from);

        if (FHE.isInitialized(_balances[to])) {
            _balances[to] = FHE.add(_balances[to], amount);
        } else {
            _balances[to] = amount;
        }
        FHE.allowThis(_balances[to]);
        FHE.allow(_balances[to], to);
    }
}
