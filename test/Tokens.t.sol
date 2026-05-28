// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {LPYToken} from "../src/LPYToken.sol";
import {LPDToken} from "../src/LPDToken.sol";

contract TokensTest is Test {
    LPYToken lpY;
    LPDToken lpD;

    address hook   = makeAddr("hook");
    address lp     = makeAddr("lp");
    address other  = makeAddr("other");

    uint256 constant POS_ID = uint256(keccak256("posId1"));
    uint256 constant AMOUNT = 1000e18;

    function setUp() public {
        lpY = new LPYToken();
        lpD = new LPDToken();
        lpY.setHook(hook);
        lpD.setHook(hook);
    }

    // ── authorization ───────────────────────────────────────────────────────

    function test_mint_onlyHook_succeeds() public {
        vm.prank(hook);
        lpY.mint(lp, POS_ID, AMOUNT);
        assertEq(lpY.balanceOf(lp, POS_ID), AMOUNT);
    }

    function test_mint_notHook_reverts() public {
        vm.prank(other);
        vm.expectRevert(LPYToken.OnlyHook.selector);
        lpY.mint(lp, POS_ID, AMOUNT);
    }

    function test_setHook_twice_reverts() public {
        vm.expectRevert(LPYToken.HookAlreadySet.selector);
        lpY.setHook(other);
    }

    // ── balanceOf ───────────────────────────────────────────────────────────

    function test_balanceOf_afterMint_correct() public {
        vm.prank(hook);
        lpD.mint(lp, POS_ID, AMOUNT);
        assertEq(lpD.balanceOf(lp, POS_ID), AMOUNT);
        assertEq(lpD.balanceOf(other, POS_ID), 0);
    }

    // ── transfer ────────────────────────────────────────────────────────────

    function test_transfer_lpY_updateBalances() public {
        vm.prank(hook);
        lpY.mint(lp, POS_ID, AMOUNT);

        vm.prank(lp);
        lpY.safeTransferFrom(lp, other, POS_ID, AMOUNT, "");

        assertEq(lpY.balanceOf(lp, POS_ID), 0);
        assertEq(lpY.balanceOf(other, POS_ID), AMOUNT);
    }

    function test_transfer_lpD_updateBalances() public {
        vm.prank(hook);
        lpD.mint(lp, POS_ID, AMOUNT);

        vm.prank(lp);
        lpD.safeTransferFrom(lp, other, POS_ID, AMOUNT, "");

        assertEq(lpD.balanceOf(lp, POS_ID), 0);
        assertEq(lpD.balanceOf(other, POS_ID), AMOUNT);
    }

    // ── burn ────────────────────────────────────────────────────────────────

    function test_burn_onlyHook_succeeds() public {
        vm.prank(hook);
        lpY.mint(lp, POS_ID, AMOUNT);

        vm.prank(hook);
        lpY.burn(lp, POS_ID, AMOUNT);

        assertEq(lpY.balanceOf(lp, POS_ID), 0);
    }

    function test_burn_notHook_reverts() public {
        vm.prank(hook);
        lpY.mint(lp, POS_ID, AMOUNT);

        vm.prank(other);
        vm.expectRevert(LPYToken.OnlyHook.selector);
        lpY.burn(lp, POS_ID, AMOUNT);
    }
}
