// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PoolManager}             from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager}            from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey}                 from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary}   from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks}                  from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks}                   from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath}                from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {StateLibrary}            from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {BalanceDelta}            from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest}            from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {HookMiner}               from "@uniswap/v4-periphery/test/shared/HookMiner.sol";
import {ERC20}                   from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {ILMath}     from "../src/lib/ILMath.sol";
import {PositionId} from "../src/lib/PositionId.sol";
import {LPYToken}   from "../src/LPYToken.sol";
import {LPDToken}   from "../src/LPDToken.sol";
import {PrismHook}  from "../src/PrismHook.sol";
import {MockUSDC}   from "./MockUSDC.sol";

contract MockToken18 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

/// @dev PrismHookTest — all 7 required tests
///
/// ARCHITECTURE NOTE: When using PoolModifyLiquidityTest, `sender` in hook
/// callbacks = address(modifyRouter), not the caller. Positions are recorded
/// under the router address. LP-Y/LP-D are minted to the router. Tests operate
/// on the router address as the canonical "LP entity."
contract PrismHookTest is Test {
    using PoolIdLibrary  for PoolKey;
    using StateLibrary   for IPoolManager;
    using CurrencyLibrary for Currency;

    uint256 constant WAD = 1e18;

    // Tick 0 = price 1:1. Tick -2877 ≈ 75% of entry (25% price drop).
    int24 constant TICK_LOWER  = -600;
    int24 constant TICK_UPPER  =  600;
    int24 constant TICK_SPACING = 60;
    uint24 constant FEE         = 3000;

    // ── contracts ────────────────────────────────────────────────────────────

    PoolManager             poolManager;
    PoolModifyLiquidityTest modifyRouter;
    PoolSwapTest            swapRouter;
    MockToken18             tokenA;  // 18-decimal pool token
    MockToken18             tokenB;  // 18-decimal pool token
    MockUSDC                usdc;    // 6-decimal collateral token (NOT a pool token)
    LPYToken                lpYToken;
    LPDToken                lpDToken;
    PrismHook               hook;

    // ── pool ─────────────────────────────────────────────────────────────────

    PoolKey    key;
    Currency   currency0;
    Currency   currency1;
    bytes32    poolId;

    // ── actors ───────────────────────────────────────────────────────────────

    address owner    = makeAddr("owner");
    address bidder   = makeAddr("bidder");
    address lp2      = makeAddr("lp2");
    address callback = makeAddr("callback");  // simulates PrismCallback / RSC path

    // ── setup ─────────────────────────────────────────────────────────────────

    function setUp() public {
        poolManager  = new PoolManager(owner);
        modifyRouter = new PoolModifyLiquidityTest(poolManager);
        swapRouter   = new PoolSwapTest(poolManager);

        usdc   = new MockUSDC();
        tokenA = new MockToken18("Token A", "TKNA");
        tokenB = new MockToken18("Token B", "TKNB");

        // sort currencies (lower address = currency0); USDC is collateral only, not a pool token
        if (address(tokenA) < address(tokenB)) {
            currency0 = Currency.wrap(address(tokenA));
            currency1 = Currency.wrap(address(tokenB));
        } else {
            currency0 = Currency.wrap(address(tokenB));
            currency1 = Currency.wrap(address(tokenA));
        }

        lpYToken = new LPYToken();
        lpDToken = new LPDToken();

        // mine a CREATE2 salt so that address(hook) has flags 0x700 in its low bits
        uint160 flags = uint160(
            Hooks.AFTER_ADD_LIQUIDITY_FLAG |
            Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG |
            Hooks.AFTER_REMOVE_LIQUIDITY_FLAG
        );
        bytes memory args = abi.encode(poolManager, lpYToken, lpDToken, address(usdc), owner);
        (, bytes32 salt) = HookMiner.find(address(this), flags, type(PrismHook).creationCode, args);

        hook = new PrismHook{salt: salt}(poolManager, lpYToken, lpDToken, address(usdc), owner);

        lpYToken.setHook(address(hook));
        lpDToken.setHook(address(hook));

        // one-time: set callback contract (owner-only)
        vm.prank(owner);
        hook.setCallbackContract(callback);

        key = PoolKey({
            currency0:   currency0,
            currency1:   currency1,
            fee:         FEE,
            tickSpacing: TICK_SPACING,
            hooks:       IHooks(address(hook))
        });
        poolId = PoolId.unwrap(key.toId());

        // initialize pool at 1:1 price (tick 0)
        poolManager.initialize(key, TickMath.getSqrtPriceAtTick(0));

        // fund test contract with pool tokens for liquidity + swaps
        tokenA.mint(address(this), 10_000_000e18);
        tokenB.mint(address(this), 10_000_000e18);
        tokenA.approve(address(modifyRouter), type(uint256).max);
        tokenB.approve(address(modifyRouter), type(uint256).max);
        tokenA.approve(address(swapRouter),   type(uint256).max);
        tokenB.approve(address(swapRouter),   type(uint256).max);

        // fund test contract + bidder with USDC for collateral
        usdc.mint(address(this), 10_000_000e6);
        usdc.mint(bidder,        1_000_000e6);
        vm.prank(bidder);
        usdc.approve(address(hook), type(uint256).max);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /// Compute the posId that _will_ be created by a deposit call in the current block.
    /// sender in hook = address(modifyRouter).
    function _expectedPosId(int24 tickLower, int24 tickUpper) internal view returns (bytes32) {
        return PositionId.positionId(poolId, address(modifyRouter), tickLower, tickUpper, block.number);
    }

    /// Add liquidity; returns the posId recorded by the hook.
    function _deposit(int24 tickLower, int24 tickUpper, int256 liquidityDelta)
        internal returns (bytes32 posId)
    {
        posId = _expectedPosId(tickLower, tickUpper);
        modifyRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower:      tickLower,
                tickUpper:      tickUpper,
                liquidityDelta: liquidityDelta,
                salt:           posId
            }),
            ""
        );
    }

    /// Remove liquidity; passes posId in hookData so beforeRemoveLiquidity can find the position.
    function _remove(bytes32 posId, int24 tickLower, int24 tickUpper, int256 liquidityDelta) internal {
        modifyRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower:      tickLower,
                tickUpper:      tickUpper,
                liquidityDelta: -liquidityDelta,
                salt:           posId
            }),
            abi.encode(posId)
        );
    }

    /// Swap to move price toward the sqrtPriceLimitX96 boundary.
    function _movePrice(bool zeroForOne) internal {
        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne:        zeroForOne,
                amountSpecified:   -100_000e18,
                sqrtPriceLimitX96: zeroForOne
                    ? TickMath.MIN_SQRT_PRICE + 1
                    : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
    }

    // ── test 1: Settlement Case 1 — LP holds both tokens ─────────────────────

    function test_settlementCase1_bothHeld_standardExit() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // LP holds both LP-Y and LP-D (no standing bid, no purchase)
        uint256 lpY = lpYToken.balanceOf(address(modifyRouter), uint256(posId));
        uint256 lpD = lpDToken.balanceOf(address(modifyRouter), uint256(posId));
        assertGt(lpY, 0, "LP-Y must be minted");
        assertGt(lpD, 0, "LP-D must be minted");

        PrismHook.Position memory pos = hook.getPosition(posId);
        assertFalse(pos.lpDSold, "lpDSold must be false");
        assertEq(lpDCollateralVault(posId), 0, "no collateral locked");

        // exit: price unchanged, no IL
        _remove(posId, TICK_LOWER, TICK_UPPER, 1e18);

        PrismHook.Position memory posAfter = hook.getPosition(posId);
        assertTrue(posAfter.settled, "position must be settled");
        assertEq(hook.lpYCompensation(posId), 0, "no IL compensation staged");
        assertEq(lpDCollateralVault(posId), 0,   "vault remains zero");
    }

    // ── test 2: Settlement Case 2 — LP-D sold, IL drawn from collateral ──────

    function test_settlementCase2_lpDSold_ilDrawnFromCollateral() public {
        // Bidder sets a standing bid
        uint256 pricePerUnit  = 0.5e18; // 0.5 WAD per unit of liquidity
        uint256 maxCollateral = 10_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, pricePerUnit, maxCollateral);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // LP-D auto-sold to bidder, vault funded
        uint256 vaultBefore = lpDCollateralVault(posId);
        assertGt(vaultBefore, 0, "collateral must be locked");
        assertEq(lpDToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP has no LP-D");
        assertEq(lpDToken.balanceOf(bidder, uint256(posId)), 1e18,            "bidder holds LP-D");

        // Move price down to force negative IL
        _movePrice(true); // zeroForOne → price decreases if tokenA is currency1

        _remove(posId, TICK_LOWER, TICK_UPPER, 1e18);

        // IL must have been drawn from vault
        uint256 comp = hook.lpYCompensation(posId);
        assertGt(comp, 0, "IL compensation must be staged");
        assertEq(lpDCollateralVault(posId), vaultBefore - comp, "vault reduced by IL cost");

        // LP-Y holder (router) claims compensation
        vm.prank(address(modifyRouter));
        hook.claimILCompensation(posId);
        assertEq(usdc.balanceOf(address(modifyRouter)), comp, "router received USDC comp");
        assertEq(hook.lpYCompensation(posId), 0, "compensation cleared after claim");
    }

    // ── test 3: Settlement Case 3 — RSC force-settle ─────────────────────────

    function test_settlementCase3_rscForced_collateralLiquidated() public {
        uint256 maxCollateral = 5_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, maxCollateral);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        assertGt(lpDCollateralVault(posId), 0, "vault must be funded");

        // Unauthorized caller must revert
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NotLPDHolder.selector, posId, attacker));
        hook.settleLPD(posId);

        // RSC callback contract forces settlement
        _movePrice(true); // drop price to create IL

        vm.prank(callback);
        hook.settleLPD(posId);

        PrismHook.Position memory pos = hook.getPosition(posId);
        assertTrue(pos.settled, "position settled by RSC");
        assertEq(lpDCollateralVault(posId), 0, "vault drained");

        // compensation or claimable must be allocated
        bool allocated = hook.lpYCompensation(posId) > 0 || hook.lpDClaimable(posId) > 0;
        assertTrue(allocated, "collateral allocated post-settlement");
    }

    // ── test 4: Standing bid auto-fill — adequate collateral ─────────────────

    function test_standingBid_adequate_autoFills() public {
        uint256 maxCollateral = 50_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, maxCollateral);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // LP has LP-Y only; bidder has LP-D
        assertGt(lpYToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP-Y minted to LP");
        assertEq(lpDToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP has no LP-D");
        assertEq(lpDToken.balanceOf(bidder, uint256(posId)), 1e18,            "bidder has LP-D");
        assertGt(lpDCollateralVault(posId), 0, "collateral locked");

        PrismHook.Position memory pos = hook.getPosition(posId);
        assertTrue(pos.lpDSold, "lpDSold must be true");
        assertEq(pos.lpDHolder, bidder, "lpDHolder = bidder");
    }

    // ── test 5: Standing bid silent skip — insufficient collateral ────────────

    function test_standingBid_insufficient_silentSkip() public {
        // pricePerUnit = 1 wei — cost is effectively 0, will not cover maxIL
        vm.prank(bidder);
        hook.setStandingBid(poolId, 1, 10_000e6);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // deposit must NOT revert; LP retains both tokens
        assertGt(lpYToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP has LP-Y");
        assertGt(lpDToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP has LP-D");
        assertEq(lpDCollateralVault(posId), 0, "no collateral locked");

        PrismHook.Position memory pos = hook.getPosition(posId);
        assertFalse(pos.lpDSold, "lpDSold must remain false");
    }

    // ── test 6: IL compensation follows LP-Y transfer ─────────────────────────

    function test_claimILComp_afterLpYTransfer_newHolderReceives() public {
        uint256 maxCollateral = 50_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, maxCollateral);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        uint256 lpYAmount = lpYToken.balanceOf(address(modifyRouter), uint256(posId));
        assertGt(lpYAmount, 0);

        // Router (original LP) transfers LP-Y to lp2
        vm.prank(address(modifyRouter));
        lpYToken.safeTransferFrom(address(modifyRouter), lp2, uint256(posId), lpYAmount, "");

        // Move price down to create IL
        _movePrice(true);

        // Remove liquidity (router is still sender, posId recovered from hookData)
        _remove(posId, TICK_LOWER, TICK_UPPER, 1e18);

        uint256 comp = hook.lpYCompensation(posId);
        assertGt(comp, 0, "IL compensation must be staged");

        // Original LP (router) no longer holds LP-Y — must revert
        vm.prank(address(modifyRouter));
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NotLPYHolder.selector, posId, address(modifyRouter)));
        hook.claimILCompensation(posId);

        // lp2 (new LP-Y holder) can claim
        uint256 lp2BalBefore = usdc.balanceOf(lp2);
        vm.prank(lp2);
        hook.claimILCompensation(posId);

        assertEq(usdc.balanceOf(lp2) - lp2BalBefore, comp, "lp2 received full compensation");
        assertEq(hook.lpYCompensation(posId), 0, "compensation cleared");
    }

    // ── test 7: positionId collision resistance ───────────────────────────────

    function test_posId_sameRangeTwoBlocks_differentIds() public {
        vm.roll(100);
        bytes32 posId1 = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // Roll forward — new block means new depositBlock → new posId
        vm.roll(101);
        // Need fresh token approval; also need to advance to avoid "same position" errors
        // Use a different tick range to avoid PoolManager position conflicts
        bytes32 posId2 = _deposit(TICK_LOWER, TICK_UPPER, 0.5e18);

        assertNotEq(posId1, posId2, "same range + different block must produce different posIds");

        // Both positions must be independently recorded
        PrismHook.Position memory p1 = hook.getPosition(posId1);
        PrismHook.Position memory p2 = hook.getPosition(posId2);
        assertEq(p1.poolId, poolId);
        assertEq(p2.poolId, poolId);
        assertNotEq(p1.liquidity, p2.liquidity, "different liquidity confirms different positions");
    }

    // ── view helper (Position is a struct, need to read mapping directly) ─────

    function lpDCollateralVault(bytes32 posId) internal view returns (uint256) {
        return hook.lpDCollateralVault(posId);
    }
}
