// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AbstractCallback} from "@reactive-network/abstract-base/AbstractCallback.sol";
import {PrismHook}        from "./PrismHook.sol";

/// @title PrismCallback
/// @notice Receives RSC callbacks from Lasna and forwards settlement calls to PrismHook.
///
/// Security model:
/// - `authorizedRSC` is set in the constructor and is NEVER changeable.
///   An immutable RSC address prevents an attacker from substituting a malicious RSC
///   that could trigger forced settlements on behalf of the protocol.
/// - `AbstractCallback` further restricts callers via its `addAuthorizedSender` list.
contract PrismCallback is AbstractCallback {
    PrismHook public immutable hook;

    // The RVM (Reactive Virtual Machine) ID of the authorised RSC on Lasna.
    // Set once at deploy time; never settable again.
    address public immutable authorizedRSC;

    error UnauthorizedCallback(address caller);

    constructor(address _hook, address _callbackSender) AbstractCallback(_callbackSender) {
        hook          = PrismHook(payable(_hook));
        authorizedRSC = _callbackSender;
    }

    /// @notice Called by the Reactive Network proxy when the RSC fires a price-reversion event.
    ///         Condition 1: price has returned to within X% of entry → settle LP-D to
    ///         return collateral to the bidder (position recovered, no IL to pay).
    function onPriceReversion(bytes32 posId) external {
        if (msg.sender != authorizedRSC) revert UnauthorizedCallback(msg.sender);
        hook.settleLPD(posId);
    }

    /// @notice Called when collateral utilisation exceeds the 90% liquidation threshold.
    ///         Condition 3: IL has consumed >= 90% of the vault → force-settle before
    ///         the vault is fully depleted.
    function onLiquidationThreshold(bytes32 posId) external {
        if (msg.sender != authorizedRSC) revert UnauthorizedCallback(msg.sender);
        hook.settleLPD(posId);
    }
}
