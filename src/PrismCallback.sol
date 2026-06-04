// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AbstractCallback} from "@reactive-network/abstract-base/AbstractCallback.sol";
import {Ownable}          from "@openzeppelin/contracts/access/Ownable.sol";
import {PrismHook}        from "./PrismHook.sol";

/// @title PrismCallback
/// @notice Receives RSC callbacks from Lasna and forwards settlement calls to PrismHook.
///
/// Security model:
/// - `authorizedRSC` is set via setAuthorizedRSC (owner-only, callable once).
///   This pattern breaks the immutability guarantee but is necessary for testnet
///   deployment where the RSC address isn't known until after callback is deployed.
/// - `AbstractCallback` further restricts callers via its `addAuthorizedSender` list.
contract PrismCallback is AbstractCallback, Ownable {
    PrismHook public immutable hook;

    // The RVM sender address authorized to deliver callbacks from the RSC on Lasna.
    // Set once via setAuthorizedRSC; zero until set.
    address public authorizedRSC;

    error UnauthorizedCallback(address caller);
    error AlreadySet();

    constructor(address _hook, address initialOwner)
        AbstractCallback(address(0))
        Ownable(initialOwner)
    {
        hook = PrismHook(payable(_hook));
    }

    /// @notice Set the authorized RSC address (callable once, owner only).
    function setAuthorizedRSC(address rsc) external onlyOwner {
        if (authorizedRSC != address(0)) revert AlreadySet();
        authorizedRSC = rsc;
    }

    /// @notice Called by the Reactive Network proxy when the RSC fires a price-reversion event.
    ///         Condition 1: price has returned to within X% of entry — settle LP-D to
    ///         return collateral to the bidder (position recovered, no IL to pay).
    function onPriceReversion(bytes32 posId) external {
        if (msg.sender != authorizedRSC) revert UnauthorizedCallback(msg.sender);
        hook.settleLPD(posId);
    }

    /// @notice Called when collateral utilisation exceeds the 90% liquidation threshold.
    ///         Condition 3: IL has consumed >= 90% of the vault — force-settle before
    ///         the vault is fully depleted.
    function onLiquidationThreshold(bytes32 posId) external {
        if (msg.sender != authorizedRSC) revert UnauthorizedCallback(msg.sender);
        hook.settleLPD(posId);
    }
}
