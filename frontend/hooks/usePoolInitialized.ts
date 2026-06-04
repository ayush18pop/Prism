'use client'
import { useMemo } from 'react'
import { keccak256, encodePacked, encodeAbiParameters } from 'viem'
import { useReadContract } from 'wagmi'
import { ADDRESSES } from '@/lib/addresses'
import { formatPoolPrice } from '@/lib/format'

const EXTSLOAD_ABI = [{
  name: 'extsload', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'slot', type: 'bytes32' }],
  outputs: [{ name: 'value', type: 'bytes32' }],
}] as const

function poolStateSlot(poolId: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['bytes32', 'uint256'], [poolId, 6n]))
}

function decodeSlot0(raw: `0x${string}`) {
  const v = BigInt(raw)
  const sqrtPriceX96 = v & ((1n << 160n) - 1n)
  const tickRaw = (v >> 160n) & ((1n << 24n) - 1n)
  const tick = tickRaw >= (1n << 23n) ? Number(tickRaw - (1n << 24n)) : Number(tickRaw)
  return { sqrtPriceX96, tick }
}

/** Compute Uniswap v4 poolId from pool key fields */
export function computePoolId(
  currency0: `0x${string}`,
  currency1: `0x${string}`,
  fee: number,
  tickSpacing: number,
  hooks: `0x${string}`,
): `0x${string}` {
  return keccak256(encodeAbiParameters(
    [
      { name: 'currency0', type: 'address' },
      { name: 'currency1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickSpacing', type: 'int24' },
      { name: 'hooks', type: 'address' },
    ],
    [currency0, currency1, fee, tickSpacing, hooks],
  ))
}

/** Check if a pool is initialized and return its current price/tick */
export function usePoolInitialized(poolId: `0x${string}` | undefined) {
  const slot = poolId ? poolStateSlot(poolId) : undefined

  const { data: rawSlot, isLoading } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: EXTSLOAD_ABI,
    functionName: 'extsload',
    args: slot ? [slot] : undefined,
    chainId: 1301,
    query: { enabled: !!ADDRESSES.PoolManager && !!slot, refetchInterval: 5_000 },
  })

  return useMemo(() => {
    if (isLoading) return { initialized: null, sqrtPriceX96: 0n, tick: 0, priceFormatted: '--', isLoading: true }
    if (!rawSlot || rawSlot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return { initialized: false, sqrtPriceX96: 0n, tick: 0, priceFormatted: '--', isLoading: false }
    }
    const { sqrtPriceX96, tick } = decodeSlot0(rawSlot)
    return {
      initialized: sqrtPriceX96 > 0n,
      sqrtPriceX96,
      tick,
      priceFormatted: formatPoolPrice(sqrtPriceX96),
      isLoading: false,
    }
  }, [rawSlot, isLoading])
}
