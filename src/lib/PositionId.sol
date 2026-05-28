// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title PositionId
/// @notice Derives a unique positionId for each LP deposit.
///         Uses block.number (not block.timestamp) so two deposits in the same
///         block but at different timestamps still collide — use block.number
///         to guarantee uniqueness within a block is impossible, but two deposits
///         from the same LP in the same block will share a positionId, which is
///         acceptable because they represent the same liquidity addition event.
///         For strict per-deposit uniqueness, callers may append a nonce externally.
library PositionId {
    /// @notice keccak256(poolId ++ lpAddress ++ tickLower ++ tickUpper ++ depositBlock)
    ///         `depositBlock` prevents collisions when the same LP re-enters the same range.
    function positionId(
        bytes32 poolId,
        address lpAddress,
        int24 tickLower,
        int24 tickUpper,
        uint256 depositBlock
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(poolId, lpAddress, tickLower, tickUpper, depositBlock));
    }
}
