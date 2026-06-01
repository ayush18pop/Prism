// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager}    from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey}         from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency}        from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks}          from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks}           from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath}        from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {HookMiner}       from "@uniswap/v4-periphery/test/shared/HookMiner.sol";

import {LPYToken}        from "../src/LPYToken.sol";
import {LPDToken}        from "../src/LPDToken.sol";
import {PrismHook}       from "../src/PrismHook.sol";
import {PrismCallback}   from "../src/PrismCallback.sol";

/// @notice 6-step deployment for Prism on Unichain Sepolia.
///
/// Prerequisites (set as env vars):
///   PRIVATE_KEY              — deployer wallet
///   POOL_MANAGER_ADDRESS     — Uniswap v4 PoolManager on Unichain Sepolia
///   USDC_ADDRESS             — USDC token address on Unichain Sepolia
///   WETH_ADDRESS             — WETH token address on Unichain Sepolia
///   RSC_ADDRESS              — PrismRSC address on Lasna (set to address(0) if not yet deployed)
///
/// Run:
///   forge script script/Deploy.s.sol --rpc-url unichain_sepolia --broadcast --verify
///
/// After running:
///   - Fill in deployments/unichain-sepolia.json with the printed addresses
///   - Then run DeployRSC.s.sol on Lasna
///   - Finally call hook.setCallbackContract(callbackAddr) via Cast
contract Deploy is Script {
    // CREATE2 deployer proxy (standard across EVM chains)
    address constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address pmAddr   = vm.envAddress("POOL_MANAGER_ADDRESS");
        address usdc     = vm.envAddress("USDC_ADDRESS");
        address weth     = vm.envAddress("WETH_ADDRESS");
        address rscAddr  = vm.envOr("RSC_ADDRESS", address(0)); // may be 0 pre-RSC deploy

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // ── Step 1: Deploy token contracts ───────────────────────────────────
        LPYToken lpY = new LPYToken();
        LPDToken lpD = new LPDToken();
        console.log("LPYToken:", address(lpY));
        console.log("LPDToken:", address(lpD));

        // ── Step 2: Mine a CREATE2 salt for the hook address ─────────────────
        uint160 flags = uint160(
            Hooks.AFTER_ADD_LIQUIDITY_FLAG |
            Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG |
            Hooks.AFTER_REMOVE_LIQUIDITY_FLAG
        );
        bytes memory constructorArgs = abi.encode(
            IPoolManager(pmAddr), lpY, lpD, usdc, deployer
        );
        (, bytes32 salt) = HookMiner.find(
            CREATE2_PROXY,
            flags,
            type(PrismHook).creationCode,
            constructorArgs
        );

        // ── Step 3: Deploy PrismHook at the mined CREATE2 address ────────────
        PrismHook hook = new PrismHook{salt: salt}(
            IPoolManager(pmAddr), lpY, lpD, usdc, deployer
        );
        console.log("PrismHook:", address(hook));
        require(uint160(address(hook)) & uint160(0x3FFF) == flags, "hook addr mismatch");

        // ── Step 4: Wire tokens → hook ────────────────────────────────────────
        lpY.setHook(address(hook));
        lpD.setHook(address(hook));
        console.log("Tokens wired to hook");

        // ── Step 5: Deploy PrismCallback (RSC callback receiver) ──────────────
        // If RSC is not yet deployed, pass address(0) for now. Call setCallbackContract
        // manually after RSC is deployed.
        PrismCallback callback = new PrismCallback(address(hook), rscAddr);
        console.log("PrismCallback:", address(callback));

        // ── Step 6: Wire hook → callback (if RSC address is known) ────────────
        if (rscAddr != address(0)) {
            hook.setCallbackContract(address(callback));
            console.log("Hook wired to callback");
        } else {
            console.log("NOTICE: call hook.setCallbackContract(callbackAddr) after RSC deploy");
        }

        vm.stopBroadcast();

        // ── Summary ───────────────────────────────────────────────────────────
        console.log("\n=== Deployment Summary ===");
        console.log("LPYToken:      ", address(lpY));
        console.log("LPDToken:      ", address(lpD));
        console.log("PrismHook:     ", address(hook));
        console.log("PrismCallback: ", address(callback));
        console.log("USDC:          ", usdc);
        console.log("WETH:          ", weth);
        console.log("PoolManager:   ", pmAddr);
        console.log("\nUpdate deployments/unichain-sepolia.json with the above.");
    }
}
