// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../test/MockUSDC.sol";

contract DeployMockToken is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        MockUSDC token = new MockUSDC();
        vm.stopBroadcast();
        console.log("MockUSDC deployed:", address(token));
    }
}
