// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHooks}                  from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager}            from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey}                 from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary}   from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Hooks}                   from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {StateLibrary}            from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {TickMath}                from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {ImmutableState}          from "@uniswap/v4-periphery/src/base/ImmutableState.sol";
import {Ownable}                 from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard}         from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20}                  from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Pausable}                from "@openzeppelin/contracts/utils/Pausable.sol";

import {ILMath}     from "./lib/ILMath.sol";
import {PositionId} from "./lib/PositionId.sol";
import {LPYToken}   from "./LPYToken.sol";
import {LPDToken}   from "./LPDToken.sol";

/// @title PrismHook
/// @notice Splits every LP deposit into LP-Y (yield, zero IL) and LP-D (delta, absorbs IL).
///
/// Hook permissions mask: 0x700
///   AFTER_ADD_LIQUIDITY_FLAG     = 1 << 10
///   BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9
///   AFTER_REMOVE_LIQUIDITY_FLAG  = 1 << 8
///
/// Deployment must use HookMiner.find(deployer, 0x700, creationCode, constructorArgs).
contract PrismHook is IHooks, ImmutableState, Ownable, ReentrancyGuard, Pausable {
    using PoolIdLibrary          for PoolKey;
    using StateLibrary           for IPoolManager;
    using BalanceDeltaLibrary    for BalanceDelta;

    // ── immutables ──────────────────────────────────────────────────────────

    LPYToken  public immutable lpYToken;
    LPDToken  public immutable lpDToken;
    address   public immutable USDC;

    // ── mutable admin ────────────────────────────────────────────────────────

    address public callbackContract;

    // ── data structures ─────────────────────────────────────────────────────

    struct Position {
        bytes32  poolId;
        uint160  entrySqrtPrice;
        int24    tickLower;
        int24    tickUpper;
        uint128  liquidity;
        address  lpDHolder;    // address that currently holds LP-D (set on purchase/auto-fill)
        bool     lpDSold;      // true once LP-D has left the LP's wallet
        bool     settled;      // idempotency guard
    }

    struct StandingBid {
        address  bidder;
        uint256  pricePerUnit;   // WAD coverage fraction: bidder covers IL up to this fraction
                                  // e.g. 0.5e18 = willing to absorb up to 50% IL
        uint256  maxCollateral;  // total USDC pre-deposited (6 dec)
        uint256  usedCollateral; // USDC already allocated to filled bids (6 dec)
        bool     active;
    }

    // ── mappings ─────────────────────────────────────────────────────────────

    mapping(bytes32 posId  => Position)    public positions;
    mapping(bytes32 poolId => StandingBid) public standingBids;
    mapping(bytes32 posId  => uint256)     public lpYCompensation;   // staged USDC for LP-Y holder
    mapping(bytes32 posId  => uint256)     public lpDCollateralVault; // locked USDC from LP-D buyer
    mapping(bytes32 posId  => uint256)     public lpDClaimable;       // LP-D holder's post-settlement claim
    mapping(bytes32 posId  => address)     public depositor;          // original LP (for token routing)

    // poolId → lp → tickLower → tickUpper → posId (fallback for callers that don't pass hookData)
    mapping(bytes32 => mapping(address => mapping(int24 => mapping(int24 => bytes32)))) public activePos;

    // ── constants ────────────────────────────────────────────────────────────

    uint256 internal constant WAD = 1e18;

    // ── errors ───────────────────────────────────────────────────────────────

    error NotCallbackContract();
    error NotLPYHolder(bytes32 posId, address caller);
    error NotLPDHolder(bytes32 posId, address caller);
    error PositionAlreadySettled(bytes32 posId);
    error PositionNotSettled(bytes32 posId);
    error CallbackAlreadySet();
    error CallbackNotSet();
    error NoCompensationStaged(bytes32 posId);
    error NoClaimableCollateral(bytes32 posId);
    error BidAlreadyActive(bytes32 poolId);
    error NotBidder(bytes32 poolId);
    error LPDAlreadySold(bytes32 posId);
    error CollateralInsufficient(uint256 required, uint256 provided);

    // ── events ───────────────────────────────────────────────────────────────

    event PositionOpened(
        bytes32 indexed posId,
        uint160 entrySqrtPrice,
        int24   tickLower,
        int24   tickUpper,
        uint256 collateral   // 0 if no standing bid; actual collateral if auto-filled
    );
    event LPDAutoPurchased(bytes32 indexed posId, address buyer, uint256 usdcCost);
    event LPDSettled(bytes32 indexed posId, uint256 ilCost, uint256 refundedToHolder);
    event LPDLiquidated(bytes32 indexed posId, uint256 collateralConsumed);
    event FeesClaimed(bytes32 indexed posId, address recipient, uint256 fees0, uint256 fees1);
    event ILCompensationClaimed(bytes32 indexed posId, address recipient, uint256 usdc);
    event StandingBidSet(bytes32 indexed poolId, address bidder, uint256 pricePerUnit, uint256 maxCollateral);
    event StandingBidCancelled(bytes32 indexed poolId, address bidder, uint256 refunded);

    // ── constructor ─────────────────────────────────────────────────────────

    constructor(
        IPoolManager _poolManager,
        LPYToken _lpYToken,
        LPDToken _lpDToken,
        address _usdc,
        address _owner
    ) ImmutableState(_poolManager) Ownable(_owner) {
        lpYToken = _lpYToken;
        lpDToken = _lpDToken;
        USDC = _usdc;

        Hooks.validateHookPermissions(
            IHooks(address(this)),
            Hooks.Permissions({
                beforeInitialize:               false,
                afterInitialize:                false,
                beforeAddLiquidity:             false,
                afterAddLiquidity:              true,
                beforeRemoveLiquidity:          true,
                afterRemoveLiquidity:           true,
                beforeSwap:                     false,
                afterSwap:                      false,
                beforeDonate:                   false,
                afterDonate:                    false,
                beforeSwapReturnDelta:          false,
                afterSwapReturnDelta:           false,
                afterAddLiquidityReturnDelta:   false,
                afterRemoveLiquidityReturnDelta:false
            })
        );
    }

    // ── admin ────────────────────────────────────────────────────────────────

    /// @notice One-time: set the RSC callback contract (step 5 of deploy order).
    function setCallbackContract(address _callback) external onlyOwner {
        if (callbackContract != address(0)) revert CallbackAlreadySet();
        callbackContract = _callback;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function getPosition(bytes32 posId) external view returns (Position memory) {
        return positions[posId];
    }

    // ── internal helpers ─────────────────────────────────────────────────────

    /// @notice _computeMaxIL with ceiling rounding for the adequacy check.
    ///         Adds 1 WAD unit so integer truncation never lets an under-collateralised
    ///         bid slip through.
    function _computeMaxILCeil(
        uint160 sqrtP0,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal pure returns (uint256) {
        uint256 raw = ILMath._computeMaxIL(sqrtP0, tickLower, tickUpper, liquidity);
        return raw + 1;
    }

    // ── hook callbacks ───────────────────────────────────────────────────────

    /// @notice Called after liquidity is added. Records entry price, mints LP-Y + LP-D,
    ///         and auto-fills a standing bid if one exists and is adequately funded.
    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external onlyPoolManager whenNotPaused returns (bytes4, BalanceDelta) {
        uint128 liquidity = uint128(uint256(params.liquidityDelta));
        bytes32 poolId    = PoolId.unwrap(key.toId());

        (uint160 sqrtP0,,,) = StateLibrary.getSlot0(poolManager, key.toId());

        bytes32 posId = PositionId.positionId(
            poolId, sender, params.tickLower, params.tickUpper, block.number
        );

        positions[posId] = Position({
            poolId:         poolId,
            entrySqrtPrice: sqrtP0,
            tickLower:      params.tickLower,
            tickUpper:      params.tickUpper,
            liquidity:      liquidity,
            lpDHolder:      sender,
            lpDSold:        false,
            settled:        false
        });
        activePos[poolId][sender][params.tickLower][params.tickUpper] = posId;
        depositor[posId] = sender;

        lpYToken.mint(sender, uint256(posId), liquidity);

        StandingBid storage bid = standingBids[poolId];
        if (bid.active) {
            // maxIL for this position as a WAD fraction, rounded up for safety
            uint256 maxIL = _computeMaxILCeil(sqrtP0, params.tickLower, params.tickUpper, liquidity);

            // Adequacy: bidder's coverage fraction must be >= position's maxIL fraction.
            // pricePerUnit is a WAD coverage fraction (e.g. 0.5e18 = willing to cover 50% IL).
            // USDC to lock = (bid's total deposit) × maxIL / WAD — proportional to actual risk.
            if (bid.pricePerUnit >= maxIL) {
                uint256 usdcForPos = (bid.maxCollateral * maxIL) / WAD; // rounds DOWN (safe)
                if (bid.usedCollateral + usdcForPos <= bid.maxCollateral) {
                    bid.usedCollateral              += usdcForPos;
                    lpDCollateralVault[posId]        = usdcForPos;
                    positions[posId].lpDHolder       = bid.bidder;
                    positions[posId].lpDSold         = true;
                    lpDToken.mint(bid.bidder, uint256(posId), liquidity);
                    emit LPDAutoPurchased(posId, bid.bidder, usdcForPos);
                    emit PositionOpened(posId, sqrtP0, params.tickLower, params.tickUpper, usdcForPos);
                    return (IHooks.afterAddLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
                }
            }
        }

        lpDToken.mint(sender, uint256(posId), liquidity);
        emit PositionOpened(posId, sqrtP0, params.tickLower, params.tickUpper, 0);
        return (IHooks.afterAddLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    /// @notice Called before liquidity is removed. Computes IL at exit and stages
    ///         USDC compensation into lpYCompensation if LP-D has been sold.
    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external onlyPoolManager returns (bytes4) {
        bytes32 poolId = PoolId.unwrap(key.toId());

        bytes32 posId = hookData.length >= 32
            ? abi.decode(hookData, (bytes32))
            : activePos[poolId][sender][params.tickLower][params.tickUpper];

        Position storage pos = positions[posId];
        if (pos.settled) revert PositionAlreadySettled(posId);

        (uint160 sqrtPriceCurrent,,,) = StateLibrary.getSlot0(poolManager, key.toId());
        int256 ilRaw = ILMath._computeIL(pos.entrySqrtPrice, sqrtPriceCurrent, pos.liquidity);

        if (pos.lpDSold && ilRaw < 0) {
            uint256 vault = lpDCollateralVault[posId];
            uint256 ilAbs = uint256(-ilRaw);
            // proportional USDC draw: ilCostUSDC = ilAbs * vault / WAD, capped at vault
            uint256 ilCost = (ilAbs * vault) / WAD;
            if (ilCost > vault) ilCost = vault;

            lpDCollateralVault[posId] -= ilCost;
            lpYCompensation[posId]     = ilCost;
        }

        return IHooks.beforeRemoveLiquidity.selector;
    }

    /// @notice Called after liquidity is removed. Clears position state and emits telemetry.
    function afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta,
        BalanceDelta,
        bytes calldata hookData
    ) external onlyPoolManager returns (bytes4, BalanceDelta) {
        bytes32 poolId = PoolId.unwrap(key.toId());

        bytes32 posId = hookData.length >= 32
            ? abi.decode(hookData, (bytes32))
            : activePos[poolId][sender][params.tickLower][params.tickUpper];

        positions[posId].settled = true;
        delete activePos[poolId][sender][params.tickLower][params.tickUpper];

        return (IHooks.afterRemoveLiquidity.selector, BalanceDeltaLibrary.ZERO_DELTA);
    }

    // ── unimplemented IHooks stubs (not used by Prism) ──────────────────────

    function beforeInitialize(address, PoolKey calldata, uint160) external pure returns (bytes4) {
        revert();
    }
    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        revert();
    }
    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external pure returns (bytes4) {
        revert();
    }
    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, bytes calldata)
        external pure returns (bytes4, BeforeSwapDelta, uint24) {
        revert();
    }
    function afterSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external pure returns (bytes4, int128) {
        revert();
    }
    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external pure returns (bytes4) {
        revert();
    }
    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external pure returns (bytes4) {
        revert();
    }

    // ── external functions (stubs — logic added in phases 3.2-3.8) ──────────

    function claimFees(PoolKey calldata key, bytes32 posId) external nonReentrant {
        if (lpYToken.balanceOf(msg.sender, uint256(posId)) == 0)
            revert NotLPYHolder(posId, msg.sender);

        Position memory pos = positions[posId];
        if (pos.settled) revert PositionAlreadySettled(posId);

        // liquidityDelta=0 triggers fee accounting without moving liquidity.
        // salt=posId attributes fees to the correct sub-position.
        (BalanceDelta feeDelta,) = poolManager.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower:      pos.tickLower,
                tickUpper:      pos.tickUpper,
                liquidityDelta: 0,
                salt:           posId
            }),
            ""
        );

        uint256 fees0 = feeDelta.amount0() > 0 ? uint256(int256(feeDelta.amount0())) : 0;
        uint256 fees1 = feeDelta.amount1() > 0 ? uint256(int256(feeDelta.amount1())) : 0;

        if (fees0 > 0) poolManager.take(key.currency0, msg.sender, fees0);
        if (fees1 > 0) poolManager.take(key.currency1, msg.sender, fees1);

        emit FeesClaimed(posId, msg.sender, fees0, fees1);
    }

    function claimILCompensation(bytes32 posId) external nonReentrant {
        if (lpYToken.balanceOf(msg.sender, uint256(posId)) == 0)
            revert NotLPYHolder(posId, msg.sender);

        uint256 comp = lpYCompensation[posId];
        if (comp == 0) revert NoCompensationStaged(posId);

        lpYCompensation[posId] = 0;
        IERC20(USDC).transfer(msg.sender, comp);

        emit ILCompensationClaimed(posId, msg.sender, comp);
    }

    function setStandingBid(bytes32 poolId, uint256 pricePerUnit, uint256 maxCollateral) external nonReentrant {
        StandingBid storage existing = standingBids[poolId];
        if (existing.active) {
            // refund unspent collateral to previous bidder before overwriting
            uint256 unspent = existing.maxCollateral - existing.usedCollateral;
            existing.active = false;
            if (unspent > 0) IERC20(USDC).transfer(existing.bidder, unspent);
            emit StandingBidCancelled(poolId, existing.bidder, unspent);
        }

        IERC20(USDC).transferFrom(msg.sender, address(this), maxCollateral);
        standingBids[poolId] = StandingBid({
            bidder:         msg.sender,
            pricePerUnit:   pricePerUnit,
            maxCollateral:  maxCollateral,
            usedCollateral: 0,
            active:         true
        });
        emit StandingBidSet(poolId, msg.sender, pricePerUnit, maxCollateral);
    }

    function cancelStandingBid(bytes32 poolId) external nonReentrant {
        StandingBid storage bid = standingBids[poolId];
        if (bid.bidder != msg.sender) revert NotBidder(poolId);

        uint256 unspent = bid.maxCollateral - bid.usedCollateral;
        bid.active = false;
        if (unspent > 0) IERC20(USDC).transfer(msg.sender, unspent);
        emit StandingBidCancelled(poolId, msg.sender, unspent);
    }

    function purchaseLPD(bytes32 posId, uint256 collateralAmount) external nonReentrant {
        Position storage pos = positions[posId];
        if (pos.lpDSold)  revert LPDAlreadySold(posId);
        if (pos.settled)  revert PositionAlreadySettled(posId);

        uint256 required = _computeMaxILCeil(
            pos.entrySqrtPrice, pos.tickLower, pos.tickUpper, pos.liquidity
        );
        if (collateralAmount < required) revert CollateralInsufficient(required, collateralAmount);

        // CEI: update state before any external calls
        lpDCollateralVault[posId] = collateralAmount;
        pos.lpDHolder = msg.sender;
        pos.lpDSold   = true;

        IERC20(USDC).transferFrom(msg.sender, address(this), collateralAmount);
        // depositor must have called lpDToken.setApprovalForAll(hook, true)
        lpDToken.safeTransferFrom(depositor[posId], msg.sender, uint256(posId), pos.liquidity, "");
    }

    function settleLPD(bytes32 posId) external nonReentrant {
        Position storage pos = positions[posId];

        bool isLPDHolder   = pos.lpDHolder == msg.sender;
        bool isCallback    = callbackContract != address(0) && msg.sender == callbackContract;
        if (!isLPDHolder && !isCallback) revert NotLPDHolder(posId, msg.sender);
        if (pos.settled) revert PositionAlreadySettled(posId);

        (uint160 sqrtPriceCurrent,,,) = StateLibrary.getSlot0(
            poolManager, PoolId.wrap(pos.poolId)
        );
        int256 ilRaw = ILMath._computeIL(pos.entrySqrtPrice, sqrtPriceCurrent, pos.liquidity);

        uint256 vault = lpDCollateralVault[posId];

        // CEI: zero vault and mark settled before any transfer
        lpDCollateralVault[posId] = 0;
        pos.settled = true;

        if (ilRaw < 0) {
            uint256 ilAbs   = uint256(-ilRaw);
            uint256 ilCost  = (ilAbs * vault) / WAD;
            if (ilCost > vault) ilCost = vault;
            uint256 remainder = vault - ilCost;

            lpYCompensation[posId] = ilCost;
            lpDClaimable[posId]    = remainder;

            if (remainder == 0) {
                emit LPDLiquidated(posId, ilCost);
            } else {
                emit LPDSettled(posId, ilCost, remainder);
            }
        } else {
            lpDClaimable[posId] = vault;
            emit LPDSettled(posId, 0, vault);
        }
    }

    function claimLPDCollateral(bytes32 posId) external nonReentrant {
        if (positions[posId].lpDHolder != msg.sender) revert NotLPDHolder(posId, msg.sender);

        uint256 claimable = lpDClaimable[posId];
        if (claimable == 0) revert NoClaimableCollateral(posId);

        lpDClaimable[posId] = 0;
        IERC20(USDC).transfer(msg.sender, claimable);
    }
}
