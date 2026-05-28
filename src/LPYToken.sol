// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @title LPYToken
/// @notice ERC-1155 yield token. tokenId = uint256(positionId).
///         Only the PrismHook may mint.
contract LPYToken is ERC1155 {
    address public hook;
    bool private _hookSet;

    error HookNotSet();
    error HookAlreadySet();
    error OnlyHook();

    constructor() ERC1155("") {}

    modifier onlyHook() {
        if (msg.sender != hook) revert OnlyHook();
        _;
    }

    /// @notice One-time setup called after hook deployment (step 3 of deploy order).
    function setHook(address _hook) external {
        if (_hookSet) revert HookAlreadySet();
        hook = _hook;
        _hookSet = true;
    }

    function mint(address to, uint256 id, uint256 amount) external onlyHook {
        // Use _update (no ERC1155Receiver check) — hook controls all mint destinations.
        uint256[] memory ids     = new uint256[](1); ids[0]     = id;
        uint256[] memory amounts = new uint256[](1); amounts[0] = amount;
        _update(address(0), to, ids, amounts);
    }

    function burn(address from, uint256 id, uint256 amount) external onlyHook {
        _burn(from, id, amount);
    }
}
