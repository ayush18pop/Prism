// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager}    from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PrismCallback}   from "../src/PrismCallback.sol";
import {PrismRouter}     from "../src/PrismRouter.sol";

/// @notice Deploys PrismCallback + PrismRouter for an already-deployed PrismHook.
contract DeployRemaining is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address pmAddr   = vm.envAddress("POOL_MANAGER_ADDRESS");
        address hook     = vm.envAddress("PRISM_HOOK_ADDRESS");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        address callbackSender = vm.envAddress("REACTIVE_CALLBACK_SENDER");
        PrismCallback callback = new PrismCallback(hook, callbackSender, deployer);
        console.log("PrismCallback:", address(callback));

        PrismRouter router = new PrismRouter(IPoolManager(pmAddr));
        console.log("PrismRouter:  ", address(router));

        vm.stopBroadcast();
    }
}
