// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AbstractReactive}  from "@reactive-network/abstract-base/AbstractReactive.sol";
import {IReactive}         from "@reactive-network/interfaces/IReactive.sol";
import {ISystemContract}   from "@reactive-network/interfaces/ISystemContract.sol";
import {ILMath}            from "../src/lib/ILMath.sol";
import {PrismCallback}     from "../src/PrismCallback.sol";

/// @title PrismRSC
/// @notice Reactive Smart Contract deployed on the Reactive Network (Lasna testnet).
///         Monitors a Uniswap v4 PrismHook on Unichain Sepolia and triggers forced
///         settlement when price conditions are met.
///
/// Subscriptions:
///   1. PrismHook::PositionOpened — to register active positions
///   2. PoolManager::Swap         — to detect price changes after deposits
///
/// Conditions:
///   1. Price Reversion (Cond-1): current price has returned to within REVERSION_BPS of
///      the position's entry price. The LP-D holder's collateral should be returned
///      (or IL is close to 0), so settle immediately.
///   2. Liquidation Threshold (Cond-3): IL has consumed >= LIQUIDATION_BPS (90%) of the
///      vault. Force-settle before the vault is fully depleted.
///
/// Deployment: this contract is deployed on Lasna. The callback target (PrismCallback)
/// is on Unichain Sepolia (chain ID 1301).
contract PrismRSC is AbstractReactive {
    // ── constants ────────────────────────────────────────────────────────────

    uint256 public constant UNICHAIN_SEPOLIA_CHAIN_ID = 1301;

    // Price must return within 1% of entry for Condition 1
    uint256 public constant REVERSION_BPS = 100; // 1% = 100 bps
    uint256 public constant WAD            = 1e18;

    // Condition 3 threshold: 90% of vault consumed by IL
    uint256 public constant LIQUIDATION_BPS = 9000; // 90% = 9000 bps
    uint256 public constant BPS_DENOM       = 10_000;

    // Event topic0 hashes — cast keccak "<sig>" verified against deployed event signatures
    // PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower,
    //                int24 tickUpper, uint256 collateral)
    uint256 public constant TOPIC_POSITION_OPENED =
        0x094ed1112c5f56637d90ec984b490f35abd3aad18d64b49f197f52e8df71c293;

    // IPoolManager::Swap(bytes32 indexed id, address indexed sender, int128 amount0,
    //                    int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick,
    //                    uint24 fee)
    uint256 public constant TOPIC_SWAP =
        0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f;

    // ── immutable addresses ──────────────────────────────────────────────────

    address public immutable callbackContract;  // PrismCallback on Unichain Sepolia
    address public immutable prismHook;         // PrismHook on Unichain Sepolia
    address public immutable poolManager;       // PoolManager on Unichain Sepolia
    bytes32 public immutable watchedPoolId;     // pool to monitor

    // ── position tracking ────────────────────────────────────────────────────

    struct TrackedPosition {
        uint160 entrySqrtPrice;
        int24   tickLower;
        int24   tickUpper;
        uint256 collateral;    // USDC locked at deposit
        bool    active;
    }

    mapping(bytes32 posId => TrackedPosition) public trackedPositions;

    // Ordered list of active posIds — iterated on every swap to check conditions.
    // Demo-scale: expected < 20 positions during the hackathon demo.
    bytes32[] public activePositionIds;

    // ── current pool state ───────────────────────────────────────────────────

    uint160 public latestSqrtPrice;

    // ── constructor ─────────────────────────────────────────────────────────

    constructor(
        address _callbackContract,
        address _prismHook,
        address _poolManager,
        bytes32 _watchedPoolId
    ) payable{
        callbackContract = _callbackContract;
        prismHook        = _prismHook;
        poolManager      = _poolManager;
        watchedPoolId    = _watchedPoolId;

        if (!vm) {
            // try/catch: the Lasna system precompile doesn't exist in forge's local EVM,
            // so simulation fails. On the actual Lasna chain the precompile is real and
            // subscribe will succeed. Catching locally lets the broadcast proceed.
            try service.subscribe(
                UNICHAIN_SEPOLIA_CHAIN_ID,
                _prismHook,
                TOPIC_POSITION_OPENED,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            ) {} catch {}

            try service.subscribe(
                UNICHAIN_SEPOLIA_CHAIN_ID,
                _poolManager,
                TOPIC_SWAP,
                uint256(_watchedPoolId),
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            ) {} catch {}
        }
    }

    // ── IReactive implementation ─────────────────────────────────────────────

    function react(IReactive.LogRecord calldata log) external vmOnly {
        if (log.topic_0 == TOPIC_POSITION_OPENED) {
            _handlePositionOpened(log);
        } else if (log.topic_0 == TOPIC_SWAP) {
            _handleSwap(log);
        }
    }

    // ── event handlers ────────────────────────────────────────────────────────

    function _handlePositionOpened(IReactive.LogRecord calldata log) internal {
        // topic_1 = indexed posId
        bytes32 posId = bytes32(log.topic_1);

        // decode non-indexed fields from log.data:
        // uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 collateral
        (uint160 sqrtP0, int24 tickLower, int24 tickUpper, uint256 collateral) =
            abi.decode(log.data, (uint160, int24, int24, uint256));

        // Only track positions that have LP-D collateral locked (auto-fill occurred)
        if (collateral == 0) return;

        trackedPositions[posId] = TrackedPosition({
            entrySqrtPrice: sqrtP0,
            tickLower:      tickLower,
            tickUpper:      tickUpper,
            collateral:     collateral,
            active:         true
        });
        activePositionIds.push(posId);
    }

    function _handleSwap(IReactive.LogRecord calldata log) internal {
        // Swap event data: (int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)
        (,, uint160 sqrtPriceX96,,,) = abi.decode(log.data, (int128, int128, uint160, uint128, int24, uint24));
        latestSqrtPrice = sqrtPriceX96;

        // Evaluate all tracked positions against the new price.
        // Inactive positions are skipped; they remain in the array (lazy cleanup is safe for demo scale).
        uint256 len = activePositionIds.length;
        for (uint256 i = 0; i < len; i++) {
            _evaluateAndFire(activePositionIds[i]);
        }
    }

    // ── condition evaluation ─────────────────────────────────────────────────

    /// @notice Check Condition 1 and Condition 3 for a position and emit a Callback if either fires.
    ///         Sets trackedPositions[posId].active = false on fire to prevent double-fire.
    function _evaluateAndFire(bytes32 posId) internal {
        TrackedPosition storage pos = trackedPositions[posId];
        if (!pos.active) return;
        if (latestSqrtPrice == 0) return;

        uint256 sqrtCurrent = uint256(latestSqrtPrice);
        uint256 sqrtEntry   = uint256(pos.entrySqrtPrice);

        // Condition 1: Price Reversion — sqrt price returned within REVERSION_BPS of entry
        uint256 diff = sqrtCurrent > sqrtEntry
            ? sqrtCurrent - sqrtEntry
            : sqrtEntry   - sqrtCurrent;
        bool priceReverted = (diff * BPS_DENOM) <= (sqrtEntry * REVERSION_BPS);

        if (priceReverted) {
            pos.active = false;
            emit IReactive.Callback(
                UNICHAIN_SEPOLIA_CHAIN_ID,
                callbackContract,
                300_000,
                abi.encodeWithSignature("onPriceReversion(bytes32)", posId)
            );
            return;
        }

        // Condition 3: Liquidation threshold — IL WAD fraction implies >= 90% vault drawdown
        int256 ilRaw = ILMath._computeIL(pos.entrySqrtPrice, latestSqrtPrice, 0);
        if (ilRaw < 0) {
            uint256 ilAbs     = uint256(-ilRaw); // WAD fraction
            uint256 ilInVault = (ilAbs * pos.collateral) / WAD;
            bool liquidated   = ilInVault * BPS_DENOM >= pos.collateral * LIQUIDATION_BPS;

            if (liquidated) {
                pos.active = false;
                emit IReactive.Callback(
                    UNICHAIN_SEPOLIA_CHAIN_ID,
                    callbackContract,
                    300_000,
                    abi.encodeWithSignature("onLiquidationThreshold(bytes32)", posId)
                );
            }
        }
    }

    /// @notice Manual entry point for evaluating a specific position (vmOnly — RVM only).
    ///         Useful for one-shot checks outside the swap event flow.
    function evaluatePosition(bytes32 posId) external vmOnly {
        _evaluateAndFire(posId);
    }
}
