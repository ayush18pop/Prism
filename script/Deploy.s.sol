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
import {PrismRouter}     from "../src/PrismRouter.sol";
import {MockUSDC}        from "../test/MockUSDC.sol";

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
        address weth     = vm.envAddress("WETH_ADDRESS");

        // USDC_ADDRESS is optional: if unset, MockUSDC is deployed and its address is printed.
        // After first run: set USDC_ADDRESS=<printed address> in .env for RSC and frontend.
        string memory usdcEnv = vm.envOr("USDC_ADDRESS", string(""));
        bool deployMockUsdc   = bytes(usdcEnv).length == 0;

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // ── Step 0 (conditional): Deploy MockUSDC if no USDC address supplied ─
        address usdc;
        if (deployMockUsdc) {
            MockUSDC mockUsdc = new MockUSDC();
            usdc = address(mockUsdc);
            console.log("MockUSDC deployed (open mint, demo only):", usdc);
            console.log("  --> Set USDC_ADDRESS=%s in .env before re-running", usdc);
        } else {
            usdc = vm.parseAddress(usdcEnv);
            console.log("Using existing USDC:", usdc);
        }

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
        // REACTIVE_CALLBACK_SENDER: the proxy address Reactive Network uses on Unichain Sepolia
        // to deliver cross-chain callbacks. Find at https://dev.reactive.network/ under
        // "Deployed contracts" → Unichain Sepolia callback proxy.
        address callbackSender = vm.envAddress("REACTIVE_CALLBACK_SENDER");
        PrismCallback callback = new PrismCallback(address(hook), callbackSender, deployer);
        console.log("PrismCallback:", address(callback));
        console.log("  callback_sender (Reactive proxy):", callbackSender);

        // Wire callback into hook immediately
        hook.setCallbackContract(address(callback));
        console.log("hook.setCallbackContract done");

        // ── Step 6: Deploy PrismRouter ────────────────────────────────────────
        PrismRouter router = new PrismRouter(IPoolManager(pmAddr));
        console.log("PrismRouter:", address(router));

        vm.stopBroadcast();

        // ── Summary ───────────────────────────────────────────────────────────
        console.log("\n=== Deployment Summary ===");
        console.log("LPYToken:      ", address(lpY));
        console.log("LPDToken:      ", address(lpD));
        console.log("PrismHook:     ", address(hook));
        console.log("PrismCallback: ", address(callback));
        console.log("PrismRouter:   ", address(router));
        console.log("USDC:          ", usdc);
        console.log("WETH:          ", weth);
        console.log("PoolManager:   ", pmAddr);
        if (deployMockUsdc) {
            console.log("\nIMPORTANT: MockUSDC deployed. Mint to demo wallets:");
            console.log("  cast send %s 'mint(address,uint256)' <wallet> 10000000000 --rpc-url unichain_sepolia --private-key $PRIVATE_KEY", usdc);
        }
        console.log("\nUpdate deployments/unichain-sepolia.json with the above.");
    }

    /// @notice Deploy only PrismRouter (after fixing IPrismHookMinimal struct).
    function deployRouter() external {
        address pmAddr = vm.envAddress("POOL_MANAGER_ADDRESS");
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        PrismRouter router = new PrismRouter(IPoolManager(pmAddr));
        console.log("PrismRouter:", address(router));
        vm.stopBroadcast();
    }
}
