// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {ILMath} from "../src/lib/ILMath.sol";

contract ILMathTest is Test {
    uint256 constant WAD = 1e18;
    // tolerance for WAD-scaled integer division rounding: 0.1% = 1e15
    uint256 constant TOLERANCE = 1e15;

    // -----------------------------------------------------------------------
    // _computeIL
    // -----------------------------------------------------------------------

    function test_computeIL_zeroPriceChange_returnsZero() public pure {
        uint160 sqrtP = TickMath.getSqrtPriceAtTick(0);
        int256 il = ILMath._computeIL(sqrtP, sqrtP, 0);
        assertEq(il, 0, "IL must be 0 when prices are equal");
    }

    function test_computeIL_minus25Percent_approxNeg134() public pure {
        // -25%: price ratio = 0.75
        // pick a reference tick and a tick ~2877 below (1.0001^-2877 ≈ 0.75)
        uint160 sqrtEntry   = TickMath.getSqrtPriceAtTick(0);
        uint160 sqrtCurrent = TickMath.getSqrtPriceAtTick(-2877);

        int256 il = ILMath._computeIL(sqrtEntry, sqrtCurrent, 0);

        // Expected: sqrt(0.75) - 1 ≈ -0.134e18
        int256 expected = -0.134e18;
        assertLt(il, 0, "IL must be negative when price decreased");
        assertApproxEqAbs(il, expected, TOLERANCE, "IL at -25% should be ~-0.134");
    }

    function test_computeIL_plus25Percent_returnsPositive() public pure {
        // +25%: price ratio = 1.25
        // tick +2231 ≈ 1.25x (1.0001^2231 ≈ 1.25)
        uint160 sqrtEntry   = TickMath.getSqrtPriceAtTick(0);
        uint160 sqrtCurrent = TickMath.getSqrtPriceAtTick(2231);

        int256 il = ILMath._computeIL(sqrtEntry, sqrtCurrent, 0);

        // Formula gives sqrt(1.25) - 1 ≈ +0.118e18 (not a loss in this direction)
        assertGt(il, 0, "Funded-LP formula positive when price rose");
    }

    function test_computeIL_independentOfLiquidity() public pure {
        uint160 sqrtEntry   = TickMath.getSqrtPriceAtTick(0);
        uint160 sqrtCurrent = TickMath.getSqrtPriceAtTick(-2877);

        // ERLI property: IL fraction does not depend on position size
        int256 il1 = ILMath._computeIL(sqrtEntry, sqrtCurrent, 0);
        int256 il2 = ILMath._computeIL(sqrtEntry, sqrtCurrent, 1e18);
        assertEq(il1, il2, "IL fraction is position-size-independent");
    }

    // -----------------------------------------------------------------------
    // _computeMaxIL
    // -----------------------------------------------------------------------

    function test_computeMaxIL_boundsLowerBoundary() public pure {
        // tick range [-2877, 2231] around tick 0 as entry
        uint160 sqrtEntry = TickMath.getSqrtPriceAtTick(0);
        int24 tickLower = -2877;
        int24 tickUpper = 2231;

        uint256 maxIL = ILMath._computeMaxIL(sqrtEntry, tickLower, tickUpper, 0);

        // IL at lower boundary
        int256 ilAtLower = ILMath._computeIL(sqrtEntry, TickMath.getSqrtPriceAtTick(tickLower), 0);
        uint256 absILAtLower = uint256(-ilAtLower);

        assertGe(maxIL, absILAtLower, "maxIL must be >= |IL at lower boundary|");
    }

    function test_computeMaxIL_upperBoundaryGainNotCounted() public pure {
        // Entry at tick 0, upper boundary is a gain — maxIL must NOT be inflated by it.
        // maxIL should equal |IL at lower boundary| (the loss side).
        uint160 sqrtEntry = TickMath.getSqrtPriceAtTick(0);
        int24 tickLower = -2877;
        int24 tickUpper = 2231;

        uint256 maxIL = ILMath._computeMaxIL(sqrtEntry, tickLower, tickUpper, 0);

        int256 ilAtLower = ILMath._computeIL(sqrtEntry, TickMath.getSqrtPriceAtTick(tickLower), 0);
        int256 ilAtUpper = ILMath._computeIL(sqrtEntry, TickMath.getSqrtPriceAtTick(tickUpper), 0);
        assertLt(ilAtLower, 0, "lower boundary is a loss");
        assertGt(ilAtUpper, 0, "upper boundary is a gain, not a risk");
        assertEq(maxIL, uint256(-ilAtLower), "maxIL = |lower boundary loss|, gain at upper not counted");
    }

    function test_computeMaxIL_wideRangeGtNarrowRange() public pure {
        // Wide tick range should have higher maxIL than narrow range (same entry)
        uint160 sqrtEntry = TickMath.getSqrtPriceAtTick(0);

        uint256 maxILNarrow = ILMath._computeMaxIL(sqrtEntry, -500, 500, 0);
        uint256 maxILWide   = ILMath._computeMaxIL(sqrtEntry, -5000, 5000, 0);

        assertGt(maxILWide, maxILNarrow, "wider range = higher worst-case IL");
    }

    function test_computeMaxIL_entryAtLower_noDownsideRisk() public pure {
        // Entry at tickLower: price can only move up from here → all movement is gain.
        // LP-D absorbs losses only, so maxIL = 0 (no loss exposure).
        int24 tickLower = -2877;
        int24 tickUpper = 2231;
        uint160 sqrtEntry = TickMath.getSqrtPriceAtTick(tickLower);

        uint256 maxIL = ILMath._computeMaxIL(sqrtEntry, tickLower, tickUpper, 0);

        int256 ilAtLower = ILMath._computeIL(sqrtEntry, TickMath.getSqrtPriceAtTick(tickLower), 0);
        assertEq(ilAtLower, 0, "IL at lower boundary = 0 when entry is at lower tick");
        assertEq(maxIL, 0, "no loss risk when entry is at lower tick, all upside");
    }
}
