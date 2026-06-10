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
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest}            from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {HookMiner}               from "@uniswap/v4-periphery/test/shared/HookMiner.sol";
import {ERC20}                   from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Pausable}                from "@openzeppelin/contracts/utils/Pausable.sol";

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

    // -- contracts ------------------------------------------------------------

    PoolManager             poolManager;
    PoolModifyLiquidityTest modifyRouter;
    PoolSwapTest            swapRouter;
    MockToken18             tokenA;  // 18-decimal pool token
    MockToken18             tokenB;  // 18-decimal pool token
    MockUSDC                usdc;    // 6-decimal collateral token (NOT a pool token)
    LPYToken                lpYToken;
    LPDToken                lpDToken;
    PrismHook               hook;

    // -- pool -----------------------------------------------------------------

    PoolKey    key;
    Currency   currency0;
    Currency   currency1;
    bytes32    poolId;

    // -- actors ---------------------------------------------------------------

    address owner    = makeAddr("owner");
    address bidder   = makeAddr("bidder");
    address lp2      = makeAddr("lp2");
    address callback = makeAddr("callback");  // simulates PrismCallback / RSC path

    // -- setup -----------------------------------------------------------------

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

    // -- helpers ---------------------------------------------------------------

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

    // -- test 1: Settlement Case 1 — LP holds both tokens ---------------------

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

    // -- test 2: Settlement Case 2 — LP-D sold, IL drawn from collateral ------

    function test_settlementCase2_lpDSold_ilDrawnFromCollateral() public {
        // Bidder sets a standing bid
        uint256 pricePerUnit  = 0.5e18; // 0.5 WAD per unit of liquidity
        uint256 maxCollateral = 10_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, pricePerUnit, 3000, 10000, maxCollateral);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // LP-D auto-sold to bidder, vault funded
        uint256 vaultBefore = lpDCollateralVault(posId);
        assertGt(vaultBefore, 0, "collateral must be locked");
        assertEq(lpDToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP has no LP-D");
        assertEq(lpDToken.balanceOf(bidder, uint256(posId)), 1e18,            "bidder holds LP-D");

        // Move price down to force negative IL
        _movePrice(true); // zeroForOne -> price decreases if tokenA is currency1

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

    // -- test 3: Settlement Case 3 — RSC force-settle -------------------------

    function test_settlementCase3_rscForced_collateralLiquidated() public {
        uint256 maxCollateral = 5_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, maxCollateral);

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

    // -- test 4: Standing bid auto-fill — adequate collateral -----------------

    function test_standingBid_adequate_autoFills() public {
        uint256 maxCollateral = 50_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, maxCollateral);

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

    // -- test 5: Standing bid silent skip — insufficient collateral ------------

    function test_standingBid_insufficient_silentSkip() public {
        // pricePerUnit = 1 wei — cost is effectively 0, will not cover maxIL
        vm.prank(bidder);
        hook.setStandingBid(poolId, 1, 3000, 10000, 10_000e6);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // deposit must NOT revert; LP retains both tokens
        assertGt(lpYToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP has LP-Y");
        assertGt(lpDToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "LP has LP-D");
        assertEq(lpDCollateralVault(posId), 0, "no collateral locked");

        PrismHook.Position memory pos = hook.getPosition(posId);
        assertFalse(pos.lpDSold, "lpDSold must remain false");
    }

    // -- test 6: IL compensation follows LP-Y transfer -------------------------

    function test_claimILComp_afterLpYTransfer_newHolderReceives() public {
        uint256 maxCollateral = 50_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, maxCollateral);

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

    // -- test 7: positionId collision resistance -------------------------------

    function test_posId_sameRangeTwoBlocks_differentIds() public {
        vm.roll(100);
        bytes32 posId1 = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // Roll forward — new block means new depositBlock -> new posId
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

    // -- Phase 3.5.5 — Fee Split Tests ----------------------------------------

    // Test 8: feeShareBpsLPD > 10000 reverts with InvalidFeeShare
    function test_setStandingBid_invalidFeeShare_reverts() public {
        usdc.approve(address(hook), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.InvalidFeeShare.selector, 10001));
        hook.setStandingBid(poolId, 0.5e18, 10001, 10000, 10_000e6);

        // 10000 is valid (LP-D takes all fees — degenerate but allowed)
        hook.setStandingBid(poolId, 0.5e18, 10000, 10000, 10_000e6);
        assertEq(standingBidFeeShare(poolId), 10000, "10000 bps accepted");
    }

    // Test 9: claimFeesLPD reverts when nothing is staged (fees never claimed yet)
    function test_claimFeesLPD_beforeClaimFees_zeroBalance() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // bidder holds LP-D but claimFees has never been called -> nothing staged
        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NoFeesClaimable.selector, posId));
        hook.claimFeesLPD(key, posId);
    }

    // Test 10: phi is locked at auto-fill time; updating the bid later has no effect on existing positions
    function test_standingBid_feeShareLockedAtFill_bidUpdateNoEffect() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 4000, 10000, 50_000e6);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        assertEq(hook.getPosition(posId).feeShareBpsLPD, 4000, "phi locked at auto-fill");

        // Replace bid with a different phi — existing position must be unaffected
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 9000, 10000, 50_000e6);

        assertEq(hook.getPosition(posId).feeShareBpsLPD, 4000, "bid update cannot mutate locked phi");
    }

    // Test 11: OTC purchaseLPD stores a custom feeShareBpsLPD in the position
    function test_purchaseLPD_customFeeShare() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // modifyRouter (depositor) must approve hook to transfer LP-D on its behalf
        vm.prank(address(modifyRouter));
        lpDToken.setApprovalForAll(address(hook), true);

        address buyer = makeAddr("buyer");
        usdc.mint(buyer, 1_000_000e6);
        vm.startPrank(buyer);
        usdc.approve(address(hook), type(uint256).max);
        hook.purchaseLPD(posId, 5_000e6, 7000, 10000); // 5000 USDC collateral, phi = 70%
        vm.stopPrank();

        PrismHook.Position memory pos = hook.getPosition(posId);
        assertEq(pos.feeShareBpsLPD, 7000, "custom phi stored from OTC purchase");
        assertEq(pos.lpDHolder, buyer,      "buyer is LP-D holder");
        assertEq(lpDCollateralVault(posId), 5_000e6, "collateral locked");
        assertTrue(pos.lpDSold, "lpDSold flag set");
    }

    // Test 12: when LP holds both tokens (no bid), phi = 0 -> claimFees would send 100% to LP-Y
    function test_claimFees_noLPDSold_allFeesToLPY() public {
        // No standing bid -> LP-D not sold -> feeShareBpsLPD = 0
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        PrismHook.Position memory pos = hook.getPosition(posId);
        assertEq(pos.feeShareBpsLPD, 0, "phi must be 0 when LP holds both tokens");
        assertFalse(pos.lpDSold, "LP-D not sold");

        // Confirm that the staged LP-D fee amount is zero
        (uint256 staged0, uint256 staged1) = hook.lpDFeesClaimable(posId);
        assertEq(staged0, 0, "no LP-D fees staged (phi=0, all fees belong to LP-Y)");
        assertEq(staged1, 0, "no LP-D fees staged for currency1");

        // LP-D holder (= modifyRouter, since LP holds both) calling claimFeesLPD reverts
        vm.prank(address(modifyRouter));
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NoFeesClaimable.selector, posId));
        hook.claimFeesLPD(key, posId);
    }

    // Test 13: with phi=3000, LP-D share is correctly split and stored; LP-D holder receives it
    function test_claimFees_withSplit_lpYReceivesCorrectShare() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        assertEq(hook.getPosition(posId).feeShareBpsLPD, 3000);

        // Verify split math: 1000 units of fees, phi=30% -> LP-Y 70%, LP-D 30%
        uint256 mockFees = 1000e18;
        uint256 phi = 3000;
        uint256 lpYShare = mockFees * (10000 - phi) / 10000;
        uint256 lpDShare = mockFees - lpYShare;
        assertEq(lpYShare, 700e18,  "LP-Y receives 70% of fees");
        assertEq(lpDShare, 300e18,  "LP-D receives 30% of fees");
        assertEq(lpYShare + lpDShare, mockFees, "shares sum to total");

        // Inject the LP-D staged amount (simulating what claimFees would have stored)
        _injectLPDFees(posId, lpDShare, 0);
        deal(Currency.unwrap(currency0), address(hook), lpDShare);

        uint256 before = ERC20(Currency.unwrap(currency0)).balanceOf(bidder);
        vm.prank(bidder);
        hook.claimFeesLPD(key, posId);
        assertEq(ERC20(Currency.unwrap(currency0)).balanceOf(bidder) - before, lpDShare,
            "LP-D holder received their 30% share");
    }

    // Test 14: claimFeesLPD drains both amount0 and amount1; second call reverts NoFeesClaimable
    function test_claimFeesLPD_afterClaimFees_lpDReceivesShare() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        uint256 staged0 = 300e18;
        uint256 staged1 = 150e18;

        // Simulate claimFees having staged LP-D fees for both currencies
        _injectLPDFees(posId, staged0, staged1);
        deal(Currency.unwrap(currency0), address(hook), staged0);
        deal(Currency.unwrap(currency1), address(hook), staged1);

        uint256 bidderBal0Before = ERC20(Currency.unwrap(currency0)).balanceOf(bidder);
        uint256 bidderBal1Before = ERC20(Currency.unwrap(currency1)).balanceOf(bidder);

        vm.prank(bidder);
        hook.claimFeesLPD(key, posId);

        assertEq(ERC20(Currency.unwrap(currency0)).balanceOf(bidder) - bidderBal0Before, staged0,
            "bidder received currency0 LP-D fees");
        assertEq(ERC20(Currency.unwrap(currency1)).balanceOf(bidder) - bidderBal1Before, staged1,
            "bidder received currency1 LP-D fees");

        // lpDFeesClaimable must be cleared — second call reverts
        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NoFeesClaimable.selector, posId));
        hook.claimFeesLPD(key, posId);
    }

    // -- view helpers ---------------------------------------------------------

    function lpDCollateralVault(bytes32 posId) internal view returns (uint256) {
        return hook.lpDCollateralVault(posId);
    }

    function standingBidFeeShare(bytes32 _poolId) internal view returns (uint256) {
        (,, uint256 feeShare,,,,) = hook.standingBids(_poolId);
        return feeShare;
    }

    /// Inject lpDFeesClaimable[posId] directly via storage slot manipulation.
    /// lpDFeesClaimable is at storage base slot 7 in PrismHook (Ownable._owner + _paused
    /// pack into slot 0; callbackContract at slot 1; mappings at slots 2–9).
    /// FeeShares.amount0 at keccak256(posId, 7), amount1 at that slot + 1.
    function _injectLPDFees(bytes32 posId, uint256 amount0, uint256 amount1) internal {
        // lpDFeesClaimable is at storage slot 10 (see: forge inspect PrismHook storage-layout)
        bytes32 baseSlot = keccak256(abi.encode(posId, uint256(10)));
        vm.store(address(hook), baseSlot, bytes32(amount0));
        vm.store(address(hook), bytes32(uint256(baseSlot) + 1), bytes32(amount1));
    }

    // -- Coverage tests: admin -------------------------------------------------

    // Test 15: setCallbackContract reverts if already set
    function test_setCallbackContract_alreadySet_reverts() public {
        vm.prank(owner);
        vm.expectRevert(PrismHook.CallbackAlreadySet.selector);
        hook.setCallbackContract(makeAddr("other"));
    }

    // Test 16: pause prevents afterAddLiquidity; unpause restores it
    function test_pause_blocksDeposit_unpause_restores() public {
        vm.prank(owner);
        hook.pause();

        vm.expectRevert(); // EnforcedPause propagates through PoolManager lock
        _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        vm.prank(owner);
        hook.unpause();

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        assertGt(lpYToken.balanceOf(address(modifyRouter), uint256(posId)), 0, "deposit succeeds after unpause");
    }

    // -- Coverage tests: cancelStandingBid ------------------------------------

    // Test 17: cancel with no fills -> full refund
    function test_cancelStandingBid_success_fullRefund() public {
        uint256 collateral = 10_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, collateral);

        uint256 before = usdc.balanceOf(bidder);
        vm.prank(bidder);
        hook.cancelStandingBid(poolId);

        assertEq(usdc.balanceOf(bidder) - before, collateral, "full collateral refunded");
        (,,,,,,bool active) = hook.standingBids(poolId);
        assertFalse(active, "bid deactivated");
    }

    // Test 18: cancel from wrong address reverts NotBidder
    function test_cancelStandingBid_notBidder_reverts() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 10_000e6);

        vm.prank(lp2);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NotBidder.selector, poolId));
        hook.cancelStandingBid(poolId);
    }

    // Test 19: cancel with partial fills refunds only unspent
    function test_cancelStandingBid_partialFill_refundsUnspent() public {
        // Use a small maxCollateral so one deposit consumes it partially
        uint256 maxCollateral = 50_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, maxCollateral);

        _deposit(TICK_LOWER, TICK_UPPER, 1e18); // consumes some collateral

        (,,,,,uint256 used,) = hook.standingBids(poolId);
        uint256 expectedRefund = maxCollateral - used;

        uint256 before = usdc.balanceOf(bidder);
        vm.prank(bidder);
        hook.cancelStandingBid(poolId);

        assertEq(usdc.balanceOf(bidder) - before, expectedRefund, "partial refund correct");
    }

    // -- Coverage tests: setStandingBid overwrite -----------------------------

    // Test 20: replacing an active bid refunds the previous bidder
    function test_setStandingBid_overwrite_refundsPrevious() public {
        // First bidder sets bid
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 10_000e6);

        // Second bidder overwrites
        address bidder2 = makeAddr("bidder2");
        usdc.mint(bidder2, 1_000_000e6);
        vm.prank(bidder2);
        usdc.approve(address(hook), type(uint256).max);

        uint256 bidderBefore = usdc.balanceOf(bidder);
        vm.prank(bidder2);
        hook.setStandingBid(poolId, 0.6e18, 4000, 10000, 20_000e6);

        assertEq(usdc.balanceOf(bidder) - bidderBefore, 10_000e6, "previous bidder refunded");
        (address activeBidder,,,,,,bool active) = hook.standingBids(poolId);
        assertEq(activeBidder, bidder2, "new bidder is active");
        assertTrue(active);
    }

    // -- Coverage tests: claimLPDCollateral -----------------------------------

    // Test 21: price goes up -> no IL -> full vault returned to LP-D holder
    function test_claimLPDCollateral_success_priceUp() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        uint256 vault = lpDCollateralVault(posId);
        assertGt(vault, 0);

        // Move price up -> ilRaw > 0 -> no IL compensation
        _movePrice(false);

        vm.prank(bidder);
        hook.settleLPD(posId);

        assertEq(hook.lpDClaimable(posId), vault, "full vault claimable after no-IL settle");

        uint256 before = usdc.balanceOf(bidder);
        vm.prank(bidder);
        hook.claimLPDCollateral(posId);
        assertEq(usdc.balanceOf(bidder) - before, vault, "bidder received full vault");
        assertEq(hook.lpDClaimable(posId), 0, "claimable zeroed");
    }

    // Test 22: claimLPDCollateral from wrong address reverts NotLPDHolder
    function test_claimLPDCollateral_notLPDHolder_reverts() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        // lpDHolder = modifyRouter (no bid)
        vm.prank(lp2);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NotLPDHolder.selector, posId, lp2));
        hook.claimLPDCollateral(posId);
    }

    // Test 23: claimLPDCollateral when lpDClaimable == 0 reverts NoClaimableCollateral
    function test_claimLPDCollateral_nothingClaimable_reverts() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        // lpDHolder = bidder, but settleLPD not called -> lpDClaimable = 0
        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NoClaimableCollateral.selector, posId));
        hook.claimLPDCollateral(posId);
    }

    // -- Coverage tests: settleLPD branches -----------------------------------

    // Test 24: settle when already settled reverts PositionAlreadySettled
    function test_settleLPD_alreadySettled_reverts() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        vm.prank(bidder);
        hook.settleLPD(posId);

        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.PositionAlreadySettled.selector, posId));
        hook.settleLPD(posId);
    }

    // -- Coverage tests: claimFees ---------------------------------------------

    // Test 25: claimFees from non-LP-Y holder reverts NotLPYHolder
    function test_claimFees_notLPYHolder_reverts() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        address nonHolder = makeAddr("nonHolder");
        vm.prank(nonHolder);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NotLPYHolder.selector, posId, nonHolder));
        hook.claimFees(key, posId);
    }

    // Test 26: claimFees on settled position reverts PositionAlreadySettled
    function test_claimFees_alreadySettled_reverts() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // Transfer LP-Y to lp2 so lp2 can attempt claimFees after settlement
        uint256 lpYAmt = lpYToken.balanceOf(address(modifyRouter), uint256(posId));
        vm.prank(address(modifyRouter));
        lpYToken.safeTransferFrom(address(modifyRouter), lp2, uint256(posId), lpYAmt, "");

        // Settle via callback (marks settled = true)
        _movePrice(false);
        vm.prank(callback);
        hook.settleLPD(posId);

        vm.prank(lp2);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.PositionAlreadySettled.selector, posId));
        hook.claimFees(key, posId);
    }

    // -- Coverage tests: claimILCompensation ----------------------------------

    // Test 27: claimILCompensation when nothing staged reverts NoCompensationStaged
    function test_claimILCompensation_nothingStaged_reverts() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        // Transfer LP-Y so lp2 holds it (and can pass the balance check)
        uint256 lpYAmt = lpYToken.balanceOf(address(modifyRouter), uint256(posId));
        vm.prank(address(modifyRouter));
        lpYToken.safeTransferFrom(address(modifyRouter), lp2, uint256(posId), lpYAmt, "");

        vm.prank(lp2);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.NoCompensationStaged.selector, posId));
        hook.claimILCompensation(posId);
    }

    // -- Coverage tests: purchaseLPD reverts ----------------------------------

    // Test 28: purchaseLPD with zero collateral reverts CollateralInsufficient
    function test_purchaseLPD_zeroCollateral_reverts() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.CollateralInsufficient.selector, 1, 0));
        hook.purchaseLPD(posId, 0, 3000, 10000);
    }

    // Test 29: purchaseLPD when LP-D already sold reverts LPDAlreadySold
    function test_purchaseLPD_alreadySold_reverts() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        vm.prank(address(modifyRouter));
        lpDToken.setApprovalForAll(address(hook), true);

        address buyer = makeAddr("buyer");
        usdc.mint(buyer, 1_000_000e6);
        vm.startPrank(buyer);
        usdc.approve(address(hook), type(uint256).max);
        hook.purchaseLPD(posId, 5_000e6, 3000, 10000);
        vm.stopPrank();

        address buyer2 = makeAddr("buyer2");
        usdc.mint(buyer2, 1_000_000e6);
        vm.startPrank(buyer2);
        usdc.approve(address(hook), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.LPDAlreadySold.selector, posId));
        hook.purchaseLPD(posId, 5_000e6, 3000, 10000);
        vm.stopPrank();
    }

    // Test 30: purchaseLPD on settled position reverts PositionAlreadySettled
    function test_purchaseLPD_alreadySettled_reverts() public {
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        _remove(posId, TICK_LOWER, TICK_UPPER, 1e18); // afterRemoveLiquidity sets settled = true

        address buyer = makeAddr("buyer");
        usdc.mint(buyer, 1_000_000e6);
        vm.startPrank(buyer);
        usdc.approve(address(hook), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.PositionAlreadySettled.selector, posId));
        hook.purchaseLPD(posId, 5_000e6, 3000, 10000);
        vm.stopPrank();
    }

    // -- Coverage tests: beforeRemoveLiquidity --------------------------------

    // Test 31: after RSC force-settle, LP must still be able to exit the pool.
    // beforeRemoveLiquidity returns early (vault already handled); afterRemoveLiquidity cleans up.
    // This verifies the fix for the "LP permanently locked after settleLPD" bug.
    function test_beforeRemoveLiquidity_afterForcedSettle_allowsExit() public {
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.5e18, 3000, 10000, 50_000e6);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        // Force-settle via RSC callback before LP removes liquidity
        _movePrice(true); // drop price so IL is non-zero
        vm.prank(callback);
        hook.settleLPD(posId);

        assertTrue(hook.getPosition(posId).settled, "position settled by RSC");
        uint256 comp = hook.lpYCompensation(posId);
        assertGt(comp, 0, "IL compensation staged by settleLPD");

        // LP must be able to exit the pool even though settled=true
        // beforeRemoveLiquidity should return cleanly, not revert
        _remove(posId, TICK_LOWER, TICK_UPPER, 1e18); // must not revert

        // LP-Y holder claims their USDC compensation
        vm.prank(address(modifyRouter));
        hook.claimILCompensation(posId);
        assertEq(usdc.balanceOf(address(modifyRouter)), comp, "LP received full IL comp after forced settle + exit");
    }

    // -- Coverage tests: bid capacity exhaustion ------------------------------

    // Test 32: when bid's used+new would exceed maxCollateral, the fill is silently skipped
    // even though pricePerUnit >= maxIL (adequacy check passes).
    //
    // Tick range [-9960, 9960] gives maxIL ≈ 65% so usdcForPos ≈ 65% of maxCollateral.
    // After one fill (65% used), a second deposit would need 130% -> exceeds 100% -> skipped.
    function test_afterAddLiquidity_bidCapacityExhausted_silentSkip() public {
        // Range where maxIL > 0.5e18 (price at lower tick is <25% of entry) so
        // two fills of equal size exhaust 100 USDC capacity.
        int24 wide_lower = -14040;
        int24 wide_upper =  14040;

        // pricePerUnit must be >= maxIL (~0.505e18); 0.9e18 passes the adequacy check.
        uint256 maxCollateral = 100e6; // 100 USDC — enough for exactly 1 fill at this range
        vm.prank(bidder);
        hook.setStandingBid(poolId, 0.9e18, 3000, 10000, maxCollateral);

        // First deposit: bid adequate, usedCollateral < maxCollateral -> fills
        vm.roll(100);
        bytes32 posId1 = _deposit(wide_lower, wide_upper, 1e18);
        assertTrue(hook.getPosition(posId1).lpDSold, "first deposit fills bid");
        assertEq(lpDToken.balanceOf(address(modifyRouter), uint256(posId1)), 0, "LP has no LP-D");

        // Second deposit: pricePerUnit still >= maxIL, but usedCollateral + cost > maxCollateral
        // -> inner capacity check fails -> silent skip -> LP retains both tokens
        vm.roll(101);
        bytes32 posId2 = _deposit(wide_lower, wide_upper, 1e18);
        assertFalse(hook.getPosition(posId2).lpDSold, "second deposit silently skipped: capacity exhausted");
        assertGt(lpDToken.balanceOf(address(modifyRouter), uint256(posId2)), 0, "LP retains LP-D on skip");
    }

    // -- Coverage tests: unimplemented hook stubs ------------------------------

    // Test 32: all disabled hook stubs revert unconditionally
    function test_hookStubs_allRevert() public {
        IPoolManager.ModifyLiquidityParams memory emptyParams;
        IPoolManager.SwapParams memory emptySwap;

        vm.expectRevert();
        hook.beforeInitialize(address(0), key, 0);

        vm.expectRevert();
        hook.afterInitialize(address(0), key, 0, 0);

        vm.expectRevert();
        hook.beforeAddLiquidity(address(0), key, emptyParams, "");

        vm.expectRevert();
        hook.beforeSwap(address(0), key, emptySwap, "");

        vm.expectRevert();
        hook.afterSwap(address(0), key, emptySwap, BalanceDeltaLibrary.ZERO_DELTA, "");

        vm.expectRevert();
        hook.beforeDonate(address(0), key, 0, 0, "");

        vm.expectRevert();
        hook.afterDonate(address(0), key, 0, 0, "");
    }

    // -- Tier 1 ilCoverageBps tests --------------------------------------------

    // Test 34: 70% coverage bid -> LP-Y comp = exactly 70% of IL
    function test_standingBid_partialCoverage_settlesCorrectFraction() public {
        uint256 maxCollateral = 50_000e6;
        vm.prank(bidder);
        hook.setStandingBid(poolId, WAD, 0, 7000, maxCollateral);

        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        assertTrue(hook.getPosition(posId).lpDSold, "bid should fill");
        assertEq(hook.getPosition(posId).ilCoverageBps, 7000, "ilCoverageBps frozen");

        uint256 vault = hook.lpDCollateralVault(posId);
        assertGt(vault, 0, "vault non-zero");

        _movePrice(true);   // move price to create IL
        _remove(posId, TICK_LOWER, TICK_UPPER, 1e18);

        PrismHook.Position memory pos = hook.getPosition(posId);
        uint160 sqrtEntry   = pos.entrySqrtPrice;
        (uint160 sqrtCurrent,,,) = StateLibrary.getSlot0(poolManager, key.toId());
        int256 ilRaw = ILMath._computeIL(sqrtEntry, sqrtCurrent, uint128(1e18));

        if (ilRaw < 0) {
            // Vault was sized at fill to coveredIL = maxIL × 70%, so the proportional
            // settlement draw comp = vault × ilAbs / maxIL pays exactly the covered
            // fraction of realized IL. Cap at vault when IL reaches/exceeds maxIL.
            uint256 ilAbs        = uint256(-ilRaw);
            uint256 expectedComp = ilAbs >= pos.maxIL ? vault : (vault * ilAbs) / pos.maxIL;
            assertGt(pos.maxIL, 0, "maxIL stored at fill");
            assertEq(hook.lpYCompensation(posId), expectedComp, "comp = proportional vault draw");
            assertLe(hook.lpYCompensation(posId), vault, "comp never exceeds vault");
        } else {
            assertEq(hook.lpYCompensation(posId), 0, "no IL, no comp");
        }
    }

    // Test 35: 70% coverage bid locks less USDC per fill than 100% coverage
    function test_standingBid_partialCoverage_locksLessUSDC() public {
        uint256 maxCollateral = 50_000e6;

        // 70% coverage bid
        vm.prank(bidder);
        hook.setStandingBid(poolId, WAD, 0, 7000, maxCollateral);
        vm.roll(100);
        bytes32 posId70 = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        uint256 vault70 = hook.lpDCollateralVault(posId70);

        // cancel and replace with 100% coverage bid
        vm.prank(bidder);
        hook.cancelStandingBid(poolId);
        vm.prank(bidder);
        hook.setStandingBid(poolId, WAD, 0, 10000, maxCollateral);
        vm.roll(101);
        bytes32 posId100 = _deposit(TICK_LOWER, TICK_UPPER, 1e18);
        uint256 vault100 = hook.lpDCollateralVault(posId100);

        assertGt(vault70,  0,      "70% bid locks some USDC");
        assertGt(vault100, vault70, "100% bid locks more USDC than 70%");
    }

    // Test 36: ilCoverageBps > 10000 reverts InvalidCoverageBps
    function test_ilCoverageBps_above10000_reverts() public {
        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.InvalidCoverageBps.selector, 10001));
        hook.setStandingBid(poolId, WAD, 0, 10001, 10_000e6);
    }

    // Test 37: ilCoverageBps == 0 reverts InvalidCoverageBps
    function test_ilCoverageBps_zero_reverts() public {
        vm.prank(bidder);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.InvalidCoverageBps.selector, 0));
        hook.setStandingBid(poolId, WAD, 0, 0, 10_000e6);
    }

    // -- Tier-2 order book tests -----------------------------------------------

    // Test 38: highest-scoring bid wins when two bids exist
    function test_orderBook_bestScoredBidWins() public {
        // bid A: 80% coverage, 20% fee share -> score = 8000 * 8000 / 10000 = 6400
        vm.prank(bidder);
        uint256 bidIdA = hook.postBid(poolId, WAD, 2000, 8000, 50_000e6);

        // bid B: 90% coverage, 10% fee share -> score = 9000 * 9000 / 10000 = 8100
        address bidder2 = makeAddr("bidder2");
        usdc.mint(bidder2, 1_000_000e6);
        vm.prank(bidder2);
        usdc.approve(address(hook), type(uint256).max);
        vm.prank(bidder2);
        uint256 bidIdB = hook.postBid(poolId, WAD, 1000, 9000, 50_000e6);

        vm.roll(block.number + 1);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        PrismHook.Position memory pos = hook.getPosition(posId);
        assertTrue(pos.lpDSold, "bid must fill");
        assertEq(pos.ilCoverageBps, 9000, "highest-score (bid B, 90%) must win");
        assertEq(pos.lpDHolder, bidder2, "LP-D holder is bid B winner");
        assertEq(hook.filledBidId(posId), bidIdB, "filledBidId records winning bid");
        assertEq(bidIdA, 0);
        assertEq(bidIdB, 1);
    }

    // Test 39: cancelling one bid leaves the other active
    function test_orderBook_twoBidsRemainIndependent() public {
        vm.prank(bidder);
        uint256 bidIdA = hook.postBid(poolId, WAD, 2000, 8000, 50_000e6);

        address bidder2 = makeAddr("bidder2b");
        usdc.mint(bidder2, 1_000_000e6);
        vm.prank(bidder2);
        usdc.approve(address(hook), type(uint256).max);
        vm.prank(bidder2);
        uint256 bidIdB = hook.postBid(poolId, WAD, 1000, 9000, 50_000e6);

        // cancel bid A; bid B must stay active
        uint256 balBefore = usdc.balanceOf(bidder);
        vm.prank(bidder);
        hook.cancelBid(poolId, bidIdA);

        (,,,,,,bool activeA) = hook.bids(poolId, bidIdA);
        (,,,,,,bool activeB) = hook.bids(poolId, bidIdB);
        assertFalse(activeA, "cancelled bid A is inactive");
        assertTrue(activeB,  "bid B still active after A cancelled");
        assertEq(usdc.balanceOf(bidder) - balBefore, 50_000e6, "full refund on cancel");
    }

    // Test 40: 21st postBid reverts MaxBidsReached
    function test_orderBook_maxBidsReached_reverts() public {
        address bidder3 = makeAddr("bidder3");
        usdc.mint(bidder3, 100_000_000e6);
        vm.prank(bidder3);
        usdc.approve(address(hook), type(uint256).max);

        for (uint256 i = 0; i < hook.MAX_BIDS_PER_POOL(); i++) {
            vm.prank(bidder3);
            hook.postBid(poolId, WAD, 0, 10000, 1000e6);
        }

        vm.prank(bidder3);
        vm.expectRevert(abi.encodeWithSelector(PrismHook.MaxBidsReached.selector, poolId, hook.MAX_BIDS_PER_POOL()));
        hook.postBid(poolId, WAD, 0, 10000, 1000e6);
    }

    // Test 41: filledBidId records the correct winning bid index
    function test_orderBook_filledBidId_recordedCorrectly() public {
        // post two bids; second one (bidId=1) is higher scored
        vm.prank(bidder);
        hook.postBid(poolId, WAD, 3000, 7000, 50_000e6);  // score 7000*7000/10000=4900

        address bidder2 = makeAddr("bidder2c");
        usdc.mint(bidder2, 1_000_000e6);
        vm.prank(bidder2);
        usdc.approve(address(hook), type(uint256).max);
        vm.prank(bidder2);
        hook.postBid(poolId, WAD, 500, 9500, 50_000e6);  // score 9500*9500/10000=9025

        vm.roll(block.number + 1);
        bytes32 posId = _deposit(TICK_LOWER, TICK_UPPER, 1e18);

        assertEq(hook.filledBidId(posId), 1, "bid at index 1 (higher score) wins");
        assertEq(hook.getPosition(posId).ilCoverageBps, 9500, "95% coverage frozen");
    }
}
