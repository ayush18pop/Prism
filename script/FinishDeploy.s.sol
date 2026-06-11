// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager}    from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PrismCallback}   from "../src/PrismCallback.sol";
import {PrismHook}       from "../src/PrismHook.sol";

import {PrismRouter}     from "../src/PrismRouter.sol";

/// Finishes the partial deployment:
///   - Deploy PrismCallback + wire to hook
///   - Deploy PrismRouter
///
/// Env vars required:
///   PRIVATE_KEY, DEPLOYER_ADDRESS, POOL_MANAGER_ADDRESS, PRISM_HOOK_ADDRESS
contract FinishDeploy is Script {
    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address pmAddr   = vm.envAddress("POOL_MANAGER_ADDRESS");
        address hookAddr = vm.envAddress("PRISM_HOOK_ADDRESS");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        address callbackSender = vm.envAddress("REACTIVE_CALLBACK_SENDER");
        PrismCallback callback = new PrismCallback(hookAddr, callbackSender, deployer);
        console.log("PrismCallback:", address(callback));

        PrismHook(payable(hookAddr)).setCallbackContract(address(callback));
        console.log("hook.setCallbackContract done");

        PrismRouter router = new PrismRouter(IPoolManager(pmAddr));
        console.log("PrismRouter:", address(router));

        vm.stopBroadcast();

        console.log("\n=== Summary ===");
        console.log("PrismCallback:", address(callback));
        console.log("PrismRouter:  ", address(router));
    }
}
