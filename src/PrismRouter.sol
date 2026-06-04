// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager}    from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey}         from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta}    from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {Currency}        from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20}          from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPrismHookMinimal {
    struct Position {
        bytes32 poolId;
        uint160 entrySqrtPrice;
        int24   tickLower;
        int24   tickUpper;
        uint128 liquidity;
        address lpDHolder;
        uint256 feeShareBpsLPD;
        bool    lpDSold;
        bool    settled;
    }
    function getPosition(bytes32 posId) external view returns (Position memory);
    function lpYToken() external view returns (address);
}

interface IERC1155Min {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

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
        bytes32 posId;
        bool    isAdd;
        bool    isSwap;
        bool    isClaimFees;
        uint256 feeShareBpsLPD;
        address hookAddr;
        bool    zeroForOne;
        int256  amountSpecified;
        uint160 sqrtPriceLimitX96;
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
                lp: msg.sender, key: key, params: params,
                posId: bytes32(0), isAdd: true,
                isSwap: false, isClaimFees: false, feeShareBpsLPD: 0, hookAddr: address(0),
                zeroForOne: false, amountSpecified: 0, sqrtPriceLimitX96: 0
            }))),
            (BalanceDelta)
        );
    }

    function swap(
        PoolKey calldata key,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) external returns (BalanceDelta delta) {
        delta = abi.decode(
            poolManager.unlock(abi.encode(CallbackData({
                lp: msg.sender, key: key,
                params: IPoolManager.ModifyLiquidityParams(0, 0, 0, bytes32(0)),
                posId: bytes32(0), isAdd: false,
                isSwap: true, isClaimFees: false, feeShareBpsLPD: 0, hookAddr: address(0),
                zeroForOne: zeroForOne, amountSpecified: amountSpecified, sqrtPriceLimitX96: sqrtPriceLimitX96
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
                lp: msg.sender, key: key, params: params,
                posId: posId, isAdd: false,
                isSwap: false, isClaimFees: false, feeShareBpsLPD: 0, hookAddr: address(0),
                zeroForOne: false, amountSpecified: 0, sqrtPriceLimitX96: 0
            }))),
            (BalanceDelta)
        );
    }

    /// @notice Claim accumulated swap fees for an LP-Y position.
    ///         Must go through the router unlock so the PoolManager is unlocked
    ///         when modifyLiquidity(liquidityDelta=0) is called.
    function claimFees(PoolKey calldata key, bytes32 posId, address hook) external {
        IPrismHookMinimal.Position memory pos = IPrismHookMinimal(hook).getPosition(posId);
        require(!pos.settled, "settled");
        address lpYToken = IPrismHookMinimal(hook).lpYToken();
        require(IERC1155Min(lpYToken).balanceOf(msg.sender, uint256(posId)) > 0, "not LP-Y holder");

        poolManager.unlock(abi.encode(CallbackData({
            lp: msg.sender, key: key,
            params: IPoolManager.ModifyLiquidityParams({
                tickLower:      pos.tickLower,
                tickUpper:      pos.tickUpper,
                liquidityDelta: 0,
                salt:           bytes32(0) // must match the salt used at deposit time
            }),
            posId: posId, isAdd: false,
            isSwap: false, isClaimFees: true,
            feeShareBpsLPD: pos.feeShareBpsLPD, hookAddr: hook,
            zeroForOne: false, amountSpecified: 0, sqrtPriceLimitX96: 0
        })));
    }

    // ── IUnlockCallback ──────────────────────────────────────────────────────

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        CallbackData memory d = abi.decode(rawData, (CallbackData));

        if (d.isClaimFees) {
            // liquidityDelta=0 triggers fee accounting without moving liquidity (v4 pull pattern).
            // hookData = abi.encode(posId) so beforeRemoveLiquidity resolves the correct position
            // instead of falling back to activePos[poolId][router][...] = bytes32(0).
            (BalanceDelta feeDelta,) = poolManager.modifyLiquidity(d.key, d.params, abi.encode(d.posId));
            uint256 fees0 = feeDelta.amount0() > 0 ? uint256(int256(feeDelta.amount0())) : 0;
            uint256 fees1 = feeDelta.amount1() > 0 ? uint256(int256(feeDelta.amount1())) : 0;
            uint256 phi   = d.feeShareBpsLPD;
            uint256 lpY0  = fees0 * (10000 - phi) / 10000;
            uint256 lpY1  = fees1 * (10000 - phi) / 10000;
            uint256 lpD0  = fees0 - lpY0;
            uint256 lpD1  = fees1 - lpY1;
            if (lpY0 > 0) poolManager.take(d.key.currency0, d.lp, lpY0);
            if (lpY1 > 0) poolManager.take(d.key.currency1, d.lp, lpY1);
            // LP-D fee share: leave in PoolManager credited to hook address for now.
            // When feeShareBpsLPD > 0, a proper stageLPDFees call on the hook is needed.
            // For current demo positions (feeShareBpsLPD=0), lpD0=lpD1=0 so this is a no-op.
            if (lpD0 > 0) poolManager.take(d.key.currency0, d.hookAddr, lpD0);
            if (lpD1 > 0) poolManager.take(d.key.currency1, d.hookAddr, lpD1);
            return abi.encode(int256(0));
        }

        if (d.isSwap) {
            BalanceDelta delta = poolManager.swap(
                d.key,
                IPoolManager.SwapParams({
                    zeroForOne:        d.zeroForOne,
                    amountSpecified:   d.amountSpecified,
                    sqrtPriceLimitX96: d.sqrtPriceLimitX96
                }),
                ""
            );
            int128 a0 = delta.amount0();
            int128 a1 = delta.amount1();
            if (a0 > 0) { poolManager.take(d.key.currency0, d.lp, uint128(a0)); }
            else if (a0 < 0) { poolManager.sync(d.key.currency0); IERC20(Currency.unwrap(d.key.currency0)).transferFrom(d.lp, address(poolManager), uint128(-a0)); poolManager.settle(); }
            if (a1 > 0) { poolManager.take(d.key.currency1, d.lp, uint128(a1)); }
            else if (a1 < 0) { poolManager.sync(d.key.currency1); IERC20(Currency.unwrap(d.key.currency1)).transferFrom(d.lp, address(poolManager), uint128(-a1)); poolManager.settle(); }
            return abi.encode(delta);
        }

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
