// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {PrismCallback}   from "../src/PrismCallback.sol";
import {PrismHook}       from "../src/PrismHook.sol";

/// @notice Deploys a fresh PrismCallback on Unichain Sepolia and wires it to PrismHook.
///
/// Prerequisites:
///   PRIVATE_KEY          - deployer wallet
///   PRISM_HOOK_ADDRESS   - existing PrismHook on Unichain Sepolia (NOT redeployed)
///   RSC_ADDRESS          - PrismRSC address on Lasna (must exist before running this,
///                          OR set to address(0) and call setAuthorizedRSC after RSC deploy)
///
/// Run:
///   forge script script/DeployCallback.s.sol --rpc-url unichain_sepolia --broadcast
///
/// After running:
///   1. Update deployments/unichain-sepolia.json: "PrismCallback": "<new address>"
///   2. Update .env: CALLBACK_CONTRACT=<new address>
///   3. If RSC needs redeploying: run DeployRSC.s.sol on Lasna with new CALLBACK_CONTRACT
///   4. Then call: cast send <callback> "setAuthorizedRSC(address)" <rsc_address> ...
contract DeployCallback is Script {
    function run() external {
        address hookAddr  = vm.envAddress("PRISM_HOOK_ADDRESS");
        address deployer  = vm.envAddress("DEPLOYER_ADDRESS");
        address rscAddr   = vm.envOr("RSC_ADDRESS", address(0));

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Deploy fresh callback
        PrismCallback callback = new PrismCallback(hookAddr, deployer);
        console.log("PrismCallback:", address(callback));

        // Wire callback into hook
        PrismHook hook = PrismHook(payable(hookAddr));
        hook.setCallbackContract(address(callback));
        console.log("hook.setCallbackContract done");

        // If RSC is already known, authorize it immediately
        if (rscAddr != address(0)) {
            callback.setAuthorizedRSC(rscAddr);
            console.log("callback.setAuthorizedRSC done:", rscAddr);
        } else {
            console.log("RSC_ADDRESS not set - run setAuthorizedRSC manually after RSC deploy");
        }

        vm.stopBroadcast();

        console.log("\n=== Callback Deployment Summary ===");
        console.log("PrismCallback:", address(callback));
        console.log("Authorized RSC:", rscAddr);
        console.log("\nUpdate deployments/unichain-sepolia.json and .env with the above.");
        console.log("Then redeploy RSC on Lasna with the new CALLBACK_CONTRACT address.");
    }
}
