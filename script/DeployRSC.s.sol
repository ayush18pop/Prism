// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {PrismRSC}        from "../reactive/PrismRSC.sol";

/// @notice Deploys PrismRSC on the Reactive Network (Lasna testnet).
///
/// Prerequisites:
///   PRIVATE_KEY              — deployer wallet (funded with REACT on Lasna)
///   CALLBACK_CONTRACT        — PrismCallback address on Unichain Sepolia (from Deploy.s.sol)
///   PRISM_HOOK_ADDRESS       — PrismHook address on Unichain Sepolia
///   POOL_MANAGER_ADDRESS     — PoolManager address on Unichain Sepolia
///   WATCHED_POOL_ID          — bytes32 poolId of the ETH/USDC Prism pool
///
/// CRITICAL: this script MUST be run BEFORE any LP deposits. If PositionOpened
/// events are emitted before the RSC is deployed, the RSC will miss those positions
/// and Conditions 1 and 3 will never fire for them.
///
/// Run:
///   forge script script/DeployRSC.s.sol --rpc-url lasna --broadcast
///
/// After running, update deployments/unichain-sepolia.json with:
///   "PrismRSC": "<lasna address>"
///
/// Then call on Unichain Sepolia:
///   cast send $PRISM_HOOK "setCallbackContract(address)" $CALLBACK_CONTRACT \
///     --private-key $PRIVATE_KEY --rpc-url unichain_sepolia
contract DeployRSC is Script {
    function run() external {
        address callbackContract = vm.envAddress("CALLBACK_CONTRACT");
        address prismHook        = vm.envAddress("PRISM_HOOK_ADDRESS");
        address poolManager      = vm.envAddress("POOL_MANAGER_ADDRESS");
        bytes32 watchedPoolId    = vm.envBytes32("WATCHED_POOL_ID");

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // Send 1 lREACT with deployment so the RSC can afford the subscribe() calls
        // in its constructor. The system contract at 0xfffFfF deducts from the RSC's
        // own balance, not the deployer's balance.
        PrismRSC rsc = new PrismRSC{value: 1 ether}(
            callbackContract,
            prismHook,
            poolManager,
            watchedPoolId
        );

        vm.stopBroadcast();

        console.log("PrismRSC deployed on Lasna:", address(rsc));
        console.log("Callback target (Unichain Sepolia):", callbackContract);
        console.log("Watched pool ID:", vm.toString(watchedPoolId));
        console.log("\nNext: call hook.setCallbackContract(callbackContract) on Unichain Sepolia");
    }
}
