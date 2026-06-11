// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {PrismCallback}   from "../src/PrismCallback.sol";
import {PrismHook}       from "../src/PrismHook.sol";

/// @notice Deploys a fresh PrismCallback on Unichain Sepolia and wires it to PrismHook.
///
/// Prerequisites:
///   PRIVATE_KEY               - deployer wallet
///   PRISM_HOOK_ADDRESS        - existing PrismHook on Unichain Sepolia (NOT redeployed)
///   REACTIVE_CALLBACK_SENDER  - Reactive proxy address on Unichain Sepolia.
///                               Find at https://dev.reactive.network/ under "Deployed contracts".
///
/// Run:
///   forge script script/DeployCallback.s.sol --rpc-url unichain_sepolia --broadcast
///
/// After running:
///   1. Update deployments/unichain-sepolia.json: "PrismCallback": "<new address>"
///   2. Update .env: CALLBACK_CONTRACT=<new address>
///   3. Redeploy RSC on Lasna with new CALLBACK_CONTRACT: forge script script/DeployRSC.s.sol ...
contract DeployCallback is Script {
    function run() external {
        address hookAddr       = vm.envAddress("PRISM_HOOK_ADDRESS");
        address deployer       = vm.envAddress("DEPLOYER_ADDRESS");
        address callbackSender = vm.envAddress("REACTIVE_CALLBACK_SENDER");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        PrismCallback callback = new PrismCallback(hookAddr, callbackSender, deployer);
        console.log("PrismCallback:", address(callback));
        console.log("  callback_sender (Reactive proxy):", callbackSender);

        PrismHook hook = PrismHook(payable(hookAddr));
        hook.setCallbackContract(address(callback));
        console.log("hook.setCallbackContract done");

        vm.stopBroadcast();

        console.log("\n=== Callback Deployment Summary ===");
        console.log("PrismCallback:", address(callback));
        console.log("\nUpdate deployments/unichain-sepolia.json and .env.");
        console.log("Then redeploy RSC on Lasna with new CALLBACK_CONTRACT.");
    }
}
