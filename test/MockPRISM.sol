// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 6-decimal demo token so pool at tick 0 = 1 PRISM = 1 USDC (human)
contract MockPRISM is ERC20 {
    constructor() ERC20("Prism Token", "PRISM") {}

    function decimals() public pure override returns (uint8) { return 6; }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
