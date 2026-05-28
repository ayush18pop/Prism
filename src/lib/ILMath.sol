// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

/// @title ILMath
/// @notice Oracle-free impermanent loss computation using pool sqrtPriceX96 values.
///         IL formula (Lipton, Lucic, Sepp 2024 — funded LP):
///             ε_funded = sqrt(pt / p0) - 1
///         Since sqrtPriceX96 = sqrt(price) × 2^96, the ratio
///             sqrtPriceCurrent / sqrtPriceEntry = sqrt(pt / p0)
///         so ε_funded = sqrtPriceCurrent / sqrtPriceEntry - 1.
///         All results are WAD-scaled (1e18 = 100%). Negative = loss.
library ILMath {
    uint256 internal constant WAD = 1e18;

    /// @notice Fractional IL for a funded LP position.
    ///         Returns 0 when prices are equal.
    ///         Returns negative (~-0.134e18) for a 25% price drop.
    ///         The `liquidity` parameter is reserved — the funded-LP formula
    ///         is position-size-independent (ERLI property, Tiruviluamala 2022).
    function _computeIL(
        uint160 sqrtPriceEntry,
        uint160 sqrtPriceCurrent,
        uint128 /* liquidity */
    ) internal pure returns (int256) {
        // ratio = (sqrtPriceCurrent / sqrtPriceEntry) scaled by WAD
        // max intermediate: 2^160 × 1e18 ≈ 2^220 — safe inside uint256 (2^256)
        uint256 ratio = (uint256(sqrtPriceCurrent) * WAD) / uint256(sqrtPriceEntry);
        return int256(ratio) - int256(WAD);
    }

    /// @notice Worst-case IL magnitude (absolute value, WAD-scaled) over a tick range.
    ///         Evaluates IL at both tick boundaries and returns the larger absolute value.
    ///         Used to size LP-D collateral: requiredCollateral = maxIL × positionValueUSDC / WAD.
    function _computeMaxIL(
        uint160 sqrtPriceEntry,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal pure returns (uint256) {
        uint160 sqrtAtLower = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtAtUpper = TickMath.getSqrtPriceAtTick(tickUpper);

        int256 ilAtLower = _computeIL(sqrtPriceEntry, sqrtAtLower, liquidity);
        int256 ilAtUpper = _computeIL(sqrtPriceEntry, sqrtAtUpper, liquidity);

        uint256 absLower = ilAtLower < 0 ? uint256(-ilAtLower) : uint256(ilAtLower);
        uint256 absUpper = ilAtUpper < 0 ? uint256(-ilAtUpper) : uint256(ilAtUpper);

        return absLower > absUpper ? absLower : absUpper;
    }
}
