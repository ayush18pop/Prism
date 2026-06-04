'use client'

import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { keccak256, encodePacked } from 'viem'
import { ADDRESSES } from '@/lib/addresses'

// v4 PoolManager exposes extsload for storage reads (getSlot0 is not a direct ABI fn).
// POOLS_SLOT=6 confirmed on Unichain Sepolia PoolManager 0x00B036...
const EXTSLOAD_ABI = [
  { name: 'extsload', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'slot', type: 'bytes32' }],
    outputs: [{ name: 'value', type: 'bytes32' }] },
] as const

function poolStateSlot(poolId: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['bytes32', 'uint256'], [poolId, 6n]))
}

function decodeSlot0(raw: `0x${string}`): { sqrtPriceX96: bigint; tick: number } {
  const v = BigInt(raw)
  const sqrtPriceX96 = v & ((1n << 160n) - 1n)
  const tickRaw = (v >> 160n) & ((1n << 24n) - 1n)
  const tick = tickRaw >= (1n << 23n) ? Number(tickRaw - (1n << 24n)) : Number(tickRaw)
  return { sqrtPriceX96, tick }
}

export function usePoolState() {
  const slot = ADDRESSES.poolId ? poolStateSlot(ADDRESSES.poolId) : undefined

  const { data: rawSlot, isError } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: EXTSLOAD_ABI,
    functionName: 'extsload',
    args: slot ? [slot] : undefined,
    chainId: 1301,
    query: {
      enabled: !!ADDRESSES.PoolManager && !!slot,
      refetchInterval: 5_000,
    },
  })

  const state = useMemo(() => {
    if (!rawSlot || rawSlot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return { sqrtPriceX96: 0n, tick: 0, loaded: false }
    }
    const { sqrtPriceX96, tick } = decodeSlot0(rawSlot)
    return { sqrtPriceX96, tick, loaded: true }
  }, [rawSlot])

  return { ...state, isError }
}
