// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AbstractCallback} from "@reactive-network/abstract-base/AbstractCallback.sol";
import {Ownable}          from "@openzeppelin/contracts/access/Ownable.sol";
import {PrismHook}        from "./PrismHook.sol";

/// @title PrismCallback
/// @notice Receives RSC callbacks from the Reactive Network proxy and forwards settlement
///         calls to PrismHook.
///
/// Security model:
/// - `AbstractCallback(_callbackSender)` authorizes the Reactive Network proxy address
///   on Unichain Sepolia — the address that actually delivers cross-chain callbacks.
///   This is NOT the RSC address on Lasna.
/// - `authorizedSenderOnly` (from AbstractPayer) verifies msg.sender is that proxy.
/// - The leading `address` param in callbacks is the RVM ID Reactive prepends; it is
///   verified by `rvmIdOnly` against the deployer stored in AbstractCallback.rvm_id.
contract PrismCallback is AbstractCallback, Ownable {
    PrismHook public immutable hook;

    error UnauthorizedCallback(address caller);

    /// @param _hook            PrismHook address on Unichain Sepolia.
    /// @param _callbackSender  Reactive Network proxy address on Unichain Sepolia.
    ///                         Find at https://dev.reactive.network/ under "Deployed contracts".
    /// @param initialOwner     Contract owner (for Ownable).
    constructor(address _hook, address _callbackSender, address initialOwner)
        AbstractCallback(_callbackSender)
        Ownable(initialOwner)
    {
        hook = PrismHook(payable(_hook));
    }

    /// @notice Condition 1 — price has returned to within REVERSION_BPS of entry.
    ///         Reactive prepends the deployer address as `_rvmId`; verified by rvmIdOnly.
    function onPriceReversion(address _rvmId, bytes32 posId)
        external
        authorizedSenderOnly
        rvmIdOnly(_rvmId)
    {
        hook.settleLPD(posId);
    }

    /// @notice Condition 3 — IL >= 90% of vault; force-settle before insolvency.
    function onLiquidationThreshold(address _rvmId, bytes32 posId)
        external
        authorizedSenderOnly
        rvmIdOnly(_rvmId)
    {
        hook.settleLPD(posId);
    }
}
