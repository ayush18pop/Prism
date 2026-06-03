// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager}    from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey}         from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta}    from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency}        from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20}          from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title PrismRouter
/// @notice Minimal router that lets users deposit/withdraw from Prism pools.
///         Encodes msg.sender as the LP address in hookData so PrismHook mints
///         LP-Y and LP-D directly to the user's wallet, not to this router.
///
/// Usage:
///   1. User approves token0 + token1 on this router.
///   2. User calls addLiquidity(key, params) — gets LP-Y/LP-D in their wallet.
///   3. User calls removeLiquidity(key, params, posId) — pool tokens returned.
contract PrismRouter is IUnlockCallback {
    IPoolManager public immutable poolManager;

    error OnlyPoolManager();

    struct CallbackData {
        address lp;
        PoolKey key;
        IPoolManager.ModifyLiquidityParams params;
        bytes32 posId;   // only used for removals (posId in hookData)
        bool    isAdd;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    // ── public entry points ──────────────────────────────────────────────────

    function addLiquidity(
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(CallbackData({
                lp:    msg.sender,
                key:   key,
                params: params,
                posId: bytes32(0),
                isAdd: true
            }))),
            (BalanceDelta)
        );
    }

    function removeLiquidity(
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes32 posId
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(CallbackData({
                lp:    msg.sender,
                key:   key,
                params: params,
                posId: posId,
                isAdd: false
            }))),
            (BalanceDelta)
        );
    }

    // ── IUnlockCallback ──────────────────────────────────────────────────────

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        CallbackData memory d = abi.decode(rawData, (CallbackData));

        bytes memory hookData = d.isAdd
            ? abi.encode(d.lp)       // tells PrismHook who the real LP is
            : abi.encode(d.posId);   // tells PrismHook which position to settle

        (BalanceDelta delta,) = poolManager.modifyLiquidity(d.key, d.params, hookData);

        // Settle positive deltas (pool owes us tokens → take them for the LP)
        // Settle negative deltas (we owe pool tokens → pull from LP and pay)
        int128 a0 = delta.amount0();
        int128 a1 = delta.amount1();

        if (a0 > 0) {
            poolManager.take(d.key.currency0, d.lp, uint128(a0));
        } else if (a0 < 0) {
            // sync snapshots current balance → transfer adds tokens → settle() pays the diff
            poolManager.sync(d.key.currency0);
            IERC20(Currency.unwrap(d.key.currency0)).transferFrom(
                d.lp, address(poolManager), uint128(-a0)
            );
            poolManager.settle();
        }

        if (a1 > 0) {
            poolManager.take(d.key.currency1, d.lp, uint128(a1));
        } else if (a1 < 0) {
            poolManager.sync(d.key.currency1);
            IERC20(Currency.unwrap(d.key.currency1)).transferFrom(
                d.lp, address(poolManager), uint128(-a1)
            );
            poolManager.settle();
        }

        return abi.encode(delta);
    }
}
