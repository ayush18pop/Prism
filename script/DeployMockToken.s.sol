// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {MockToken18} from "../test/PrismHook.t.sol";

contract DeployMockToken is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        MockToken18 token = new MockToken18("Prism Token", "PRISM");
        vm.stopBroadcast();
        console.log("PRISM token deployed:", address(token));
        console.log("Add PRISM_ADDRESS=%s to .env", address(token));
    }
}
