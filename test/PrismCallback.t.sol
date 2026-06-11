// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PrismCallback} from "../src/PrismCallback.sol";

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

    // Simulates the Reactive proxy on the destination chain.
    address reactiveProxy;
    address attacker;

    function setUp() public {
        reactiveProxy = makeAddr("reactiveProxy");
        attacker      = makeAddr("attacker");

        mockHook = new MockHookForCallback();
        // constructor: (hook, callbackSender, owner)
        // callbackSender = reactiveProxy (authorized to call onPriceReversion etc.)
        // owner = address(this) → also sets rvm_id = address(this) inside AbstractCallback
        cb = new PrismCallback(address(mockHook), reactiveProxy, address(this));
    }

    function test_hook_matchesConstructorArg() public {
        assertEq(address(cb.hook()), address(mockHook));
    }

    // ── onPriceReversion ──────────────────────────────────────────────────────

    function test_onPriceReversion_proxy_callsSettleLPD() public {
        bytes32 posId = bytes32(uint256(42));
        // msg.sender = reactiveProxy (authorizedSenderOnly), _rvmId = address(this) (rvmIdOnly)
        vm.prank(reactiveProxy);
        cb.onPriceReversion(address(this), posId);

        assertEq(mockHook.settleCount(), 1, "settleLPD called once");
        assertEq(mockHook.lastSettledPosId(), posId, "correct posId forwarded");
    }

    function test_onPriceReversion_wrongSender_reverts() public {
        // Not the Reactive proxy → authorizedSenderOnly reverts
        vm.prank(attacker);
        vm.expectRevert("Authorized sender only");
        cb.onPriceReversion(address(this), bytes32(0));
    }

    function test_onPriceReversion_wrongRvmId_reverts() public {
        // Correct proxy but wrong rvm_id → rvmIdOnly reverts
        vm.prank(reactiveProxy);
        vm.expectRevert("Authorized RVM ID only");
        cb.onPriceReversion(attacker, bytes32(0));
    }

    // ── onLiquidationThreshold ────────────────────────────────────────────────

    function test_onLiquidationThreshold_proxy_callsSettleLPD() public {
        bytes32 posId = bytes32(uint256(99));
        vm.prank(reactiveProxy);
        cb.onLiquidationThreshold(address(this), posId);

        assertEq(mockHook.settleCount(), 1, "settleLPD called once");
        assertEq(mockHook.lastSettledPosId(), posId, "correct posId forwarded");
    }

    function test_onLiquidationThreshold_wrongSender_reverts() public {
        vm.prank(attacker);
        vm.expectRevert("Authorized sender only");
        cb.onLiquidationThreshold(address(this), bytes32(0));
    }

    function test_bothConditions_independentlyCallSettle() public {
        vm.prank(reactiveProxy);
        cb.onPriceReversion(address(this), bytes32(uint256(1)));

        vm.prank(reactiveProxy);
        cb.onLiquidationThreshold(address(this), bytes32(uint256(2)));

        assertEq(mockHook.settleCount(), 2, "two settle calls total");
    }
}
