'use client'
import { useMemo } from 'react'
import { keccak256, encodePacked, encodeAbiParameters, toHex } from 'viem'
import { useReadContract } from 'wagmi'
import { ADDRESSES } from '@/lib/addresses'

// extsload(bytes32[]) — batch storage read from PoolManager
const EXTSLOAD_ARRAY_ABI = [{
  name: 'extsload', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'slots', type: 'bytes32[]' }],
  outputs: [{ name: 'values', type: 'bytes32[]' }],
}] as const

const ZERO_SALT = '0x0000000000000000000000000000000000000000000000000000000000000000' as const
const MOD = 1n << 256n
const Q128 = 1n << 128n

// Solidity unchecked subtraction (wraps mod 2^256)
const wsub = (a: bigint, b: bigint) => (((a - b) % MOD) + MOD) % MOD

function slotAdd(slot: `0x${string}`, n: bigint): `0x${string}` {
  return toHex(BigInt(slot) + n, { size: 32 })
}

// PoolManager: mapping(PoolId => Pool.State) _pools is at slot 6
function poolStateSlot(poolId: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['bytes32', 'uint256'], [poolId, 6n]))
}

// Pool.State.ticks is at stateSlot+4; key is int24 (sign-extended to int256)
function tickInfoSlot(stateSlot: `0x${string}`, tick: number): `0x${string}` {
  return keccak256(encodeAbiParameters(
    [{ type: 'int256' }, { type: 'uint256' }],
    [BigInt(tick), BigInt(stateSlot) + 4n],
  ))
}

// Pool.State.positions is at stateSlot+6; key = keccak256(owner ‖ tickLower ‖ tickUpper ‖ salt)
function positionStateSlot(
  stateSlot: `0x${string}`, owner: `0x${string}`, tickLower: number, tickUpper: number,
): `0x${string}` {
  const posKey = keccak256(encodePacked(
    ['address', 'int24', 'int24', 'bytes32'],
    [owner, tickLower, tickUpper, ZERO_SALT],
  ))
  return keccak256(encodePacked(['bytes32', 'uint256'], [posKey, BigInt(stateSlot) + 6n]))
}

function decodeTick(slot0Raw: `0x${string}`): number {
  const v = BigInt(slot0Raw)
  const tickRaw = (v >> 160n) & ((1n << 24n) - 1n)
  return tickRaw >= (1n << 23n) ? Number(tickRaw - (1n << 24n)) : Number(tickRaw)
}

export interface PendingFees {
  /** total unclaimed fees for the position (before LP-Y/LP-D split) */
  pending0: bigint
  pending1: bigint
  /** liquidity recorded in the PoolManager for (router, ticks, salt=0) — 0 means
   *  the position was created through a different router and can't be claimed here */
  managerLiquidity: bigint
  isLoading: boolean
}

/**
 * Computes unclaimed swap fees for a position by reading PoolManager storage:
 *   pending = (feeGrowthInside_now − feeGrowthInsideLast) × liquidity / 2^128
 * Mirrors v4-core Pool.getFeeGrowthInside + Position.update exactly (wrapping math).
 */
export function usePendingFees(
  poolId: `0x${string}` | undefined,
  tickLower: number,
  tickUpper: number,
): PendingFees {
  const router = ADDRESSES.PrismRouter

  const slots = useMemo(() => {
    if (!poolId || !router || tickLower === tickUpper) return undefined
    const s = poolStateSlot(poolId)
    const lo = tickInfoSlot(s, tickLower)
    const up = tickInfoSlot(s, tickUpper)
    const ps = positionStateSlot(s, router, tickLower, tickUpper)
    return [
      s,                  // 0: slot0 (current tick)
      slotAdd(s, 1n),     // 1: feeGrowthGlobal0X128
      slotAdd(s, 2n),     // 2: feeGrowthGlobal1X128
      slotAdd(lo, 1n),    // 3: lower.feeGrowthOutside0X128
      slotAdd(lo, 2n),    // 4: lower.feeGrowthOutside1X128
      slotAdd(up, 1n),    // 5: upper.feeGrowthOutside0X128
      slotAdd(up, 2n),    // 6: upper.feeGrowthOutside1X128
      ps,                 // 7: position.liquidity (uint128, low bits)
      slotAdd(ps, 1n),    // 8: position.feeGrowthInside0LastX128
      slotAdd(ps, 2n),    // 9: position.feeGrowthInside1LastX128
    ] as `0x${string}`[]
  }, [poolId, router, tickLower, tickUpper])

  const { data: raw, isLoading } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: EXTSLOAD_ARRAY_ABI,
    functionName: 'extsload',
    args: slots ? [slots] : undefined,
    chainId: 1301,
    query: { enabled: !!ADDRESSES.PoolManager && !!slots, refetchInterval: 10_000 },
  })

  return useMemo(() => {
    if (!raw || raw.length !== 10) {
      return { pending0: 0n, pending1: 0n, managerLiquidity: 0n, isLoading }
    }
    const v = raw.map((x) => BigInt(x))
    const liquidity = v[7] & ((1n << 128n) - 1n)
    if (liquidity === 0n) return { pending0: 0n, pending1: 0n, managerLiquidity: 0n, isLoading: false }

    const tick = decodeTick(raw[0])
    const [g0, g1, lo0, lo1, up0, up1] = [v[1], v[2], v[3], v[4], v[5], v[6]]

    // Pool.getFeeGrowthInside — branch on current tick vs range
    let inside0: bigint, inside1: bigint
    if (tick < tickLower) {
      inside0 = wsub(lo0, up0); inside1 = wsub(lo1, up1)
    } else if (tick >= tickUpper) {
      inside0 = wsub(up0, lo0); inside1 = wsub(up1, lo1)
    } else {
      inside0 = wsub(wsub(g0, lo0), up0); inside1 = wsub(wsub(g1, lo1), up1)
    }

    return {
      pending0: (wsub(inside0, v[8]) * liquidity) / Q128,
      pending1: (wsub(inside1, v[9]) * liquidity) / Q128,
      managerLiquidity: liquidity,
      isLoading: false,
    }
  }, [raw, isLoading, tickLower, tickUpper])
}
