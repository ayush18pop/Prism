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

    // Event topic0 hashes (keccak256 of event signatures)
    // PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower,
    //                int24 tickUpper, uint256 collateral)
    uint256 public constant TOPIC_POSITION_OPENED =
        0x9d7cccb7a1d7e3e14e68e2ad97e1e70ab8d7d70e857d7c1a70cc0e1bc9a9c1b2;

    // IPoolManager::Swap(bytes32 indexed id, address indexed sender, int128 amount0,
    //                    int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick,
    //                    uint24 fee)
    uint256 public constant TOPIC_SWAP =
        0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca2d09f5c74d4ef;

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

    // ── current pool state ───────────────────────────────────────────────────

    uint160 public latestSqrtPrice;

    // ── constructor ─────────────────────────────────────────────────────────

    constructor(
        address _callbackContract,
        address _prismHook,
        address _poolManager,
        bytes32 _watchedPoolId
    ) {
        callbackContract = _callbackContract;
        prismHook        = _prismHook;
        poolManager      = _poolManager;
        watchedPoolId    = _watchedPoolId;

        if (!vm) {
            // Subscribe to PositionOpened from PrismHook on Unichain Sepolia
            service.subscribe(
                UNICHAIN_SEPOLIA_CHAIN_ID,
                _prismHook,
                TOPIC_POSITION_OPENED,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );

            // Subscribe to Swap events from PoolManager on Unichain Sepolia
            // Filter by poolId in topic_1 (indexed `id` field in Swap event)
            service.subscribe(
                UNICHAIN_SEPOLIA_CHAIN_ID,
                _poolManager,
                TOPIC_SWAP,
                uint256(_watchedPoolId), // only swaps in our pool
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            );
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
    }

    function _handleSwap(IReactive.LogRecord calldata log) internal {
        // Swap event data: (int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)
        (,, uint160 sqrtPriceX96,,,) = abi.decode(log.data, (int128, int128, uint160, uint128, int24, uint24));
        latestSqrtPrice = sqrtPriceX96;

        // Check all tracked positions against the new price
        // NOTE: In production, this would iterate a packed active-position list.
        // For the demo, posId is passed via direct callback from the frontend trigger.
    }

    // ── condition checks (callable by frontend/keeper for demo) ──────────────

    /// @notice Evaluate conditions for a specific position and fire callback if met.
    ///         In production, this would be called from within _handleSwap for each tracked position.
    ///         For the demo, the frontend calls this after each swap to trigger RSC logic.
    function evaluatePosition(bytes32 posId) external vmOnly {
        TrackedPosition memory pos = trackedPositions[posId];
        if (!pos.active) return;
        if (latestSqrtPrice == 0) return;

        uint256 sqrtCurrent = uint256(latestSqrtPrice);
        uint256 sqrtEntry   = uint256(pos.entrySqrtPrice);

        // Condition 1: Price Reversion — price returned within REVERSION_BPS of entry
        // |sqrtCurrent - sqrtEntry| / sqrtEntry < REVERSION_BPS / 10000
        uint256 diff = sqrtCurrent > sqrtEntry
            ? sqrtCurrent - sqrtEntry
            : sqrtEntry   - sqrtCurrent;
        bool priceReverted = (diff * BPS_DENOM) <= (sqrtEntry * REVERSION_BPS);

        if (priceReverted) {
            trackedPositions[posId].active = false;
            emit IReactive.Callback(
                UNICHAIN_SEPOLIA_CHAIN_ID,
                callbackContract,
                300_000,
                abi.encodeWithSignature("onPriceReversion(bytes32)", posId)
            );
            return;
        }

        // Condition 3: Liquidation threshold — IL >= 90% of vault
        // IL fraction = |sqrtCurrent/sqrtEntry - 1| = diff/sqrtEntry
        // ilDrawn = ilFrac * collateral
        // threshold hit when: ilFrac * collateral >= LIQUIDATION_BPS/BPS_DENOM * collateral
        //                   i.e. ilFrac >= 0.9
        // ilFrac = diff / sqrtEntry (in sqrt-price space, not price space)
        // For a simple check: if current sqrtPrice implies > 90% vault drawdown
        int256 ilRaw = ILMath._computeIL(pos.entrySqrtPrice, latestSqrtPrice, 0);
        if (ilRaw < 0) {
            uint256 ilAbs     = uint256(-ilRaw); // WAD fraction
            uint256 ilInVault = (ilAbs * pos.collateral) / WAD;
            bool liquidated   = ilInVault * BPS_DENOM >= pos.collateral * LIQUIDATION_BPS;

            if (liquidated) {
                trackedPositions[posId].active = false;
                emit IReactive.Callback(
                    UNICHAIN_SEPOLIA_CHAIN_ID,
                    callbackContract,
                    300_000,
                    abi.encodeWithSignature("onLiquidationThreshold(bytes32)", posId)
                );
            }
        }
    }
}
