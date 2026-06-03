// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager}    from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PrismRouter}     from "../src/PrismRouter.sol";

contract DeployRouter is Script {
    function run() external {
        address pmAddr = vm.envAddress("POOL_MANAGER_ADDRESS");
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        PrismRouter router = new PrismRouter(IPoolManager(pmAddr));
        vm.stopBroadcast();
        console.log("PrismRouter:", address(router));
        console.log("Update ADDRESSES.PrismRouter in frontend/lib/addresses.ts");
    }
}
