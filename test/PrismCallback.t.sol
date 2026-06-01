// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PrismCallback} from "../src/PrismCallback.sol";

/// @dev Minimal stand-in for PrismHook — only needs settleLPD(bytes32).
///      PrismCallback casts _hook to PrismHook(payable(_hook)), so the mock
///      just needs to expose the same function selector.
contract MockHookForCallback {
    uint256 public settleCount;
    bytes32 public lastSettledPosId;

    receive() external payable {}

    function settleLPD(bytes32 posId) external {
        settleCount++;
        lastSettledPosId = posId;
    }
}

contract PrismCallbackTest is Test {
    MockHookForCallback mockHook;
    PrismCallback       cb;

    address rsc;
    address attacker;

    function setUp() public {
        rsc      = makeAddr("rsc");
        attacker = makeAddr("attacker");

        mockHook = new MockHookForCallback();
        cb       = new PrismCallback(address(mockHook), rsc);
    }

    // ── immutable state ────────────────────────────────────────────────────────

    function test_authorizedRSC_matchesConstructorArg() public {
        assertEq(cb.authorizedRSC(), rsc);
    }

    function test_hook_matchesConstructorArg() public {
        // hook is PrismHook immutable — address should match mockHook
        assertEq(address(cb.hook()), address(mockHook));
    }

    // ── onPriceReversion ──────────────────────────────────────────────────────

    function test_onPriceReversion_authorizedRSC_callsSettleLPD() public {
        bytes32 posId = bytes32(uint256(42));
        vm.prank(rsc);
        cb.onPriceReversion(posId);

        assertEq(mockHook.settleCount(), 1, "settleLPD called once");
        assertEq(mockHook.lastSettledPosId(), posId, "correct posId forwarded");
    }

    function test_onPriceReversion_unauthorized_reverts() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(PrismCallback.UnauthorizedCallback.selector, attacker));
        cb.onPriceReversion(bytes32(0));
    }

    // ── onLiquidationThreshold ────────────────────────────────────────────────

    function test_onLiquidationThreshold_authorizedRSC_callsSettleLPD() public {
        bytes32 posId = bytes32(uint256(99));
        vm.prank(rsc);
        cb.onLiquidationThreshold(posId);

        assertEq(mockHook.settleCount(), 1, "settleLPD called once");
        assertEq(mockHook.lastSettledPosId(), posId, "correct posId forwarded");
    }

    function test_onLiquidationThreshold_unauthorized_reverts() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(PrismCallback.UnauthorizedCallback.selector, attacker));
        cb.onLiquidationThreshold(bytes32(0));
    }

    // ── both conditions increment settle count independently ──────────────────

    function test_bothConditions_independentlyCallSettle() public {
        vm.prank(rsc);
        cb.onPriceReversion(bytes32(uint256(1)));

        vm.prank(rsc);
        cb.onLiquidationThreshold(bytes32(uint256(2)));

        assertEq(mockHook.settleCount(), 2, "two settle calls total");
    }
}
