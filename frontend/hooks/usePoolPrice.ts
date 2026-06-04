'use client'
import { useMemo } from 'react'
import { keccak256, encodePacked } from 'viem'
import { useReadContract } from 'wagmi'
import { ADDRESSES } from '@/lib/addresses'
import { formatPoolPrice, sqrtPriceToPrice } from '@/lib/format'

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

/** Polls pool price every 3s via PoolManager.extsload */
export function usePoolPrice() {
  const slot = ADDRESSES.poolId ? poolStateSlot(ADDRESSES.poolId) : undefined

  const { data: rawSlot, isLoading, isRefetching } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: EXTSLOAD_ABI,
    functionName: 'extsload',
    args: slot ? [slot] : undefined,
    chainId: 1301,
    query: {
      enabled: !!ADDRESSES.PoolManager && !!slot,
      refetchInterval: 3_000,
    },
  })

  const decoded = useMemo(() => {
    if (!rawSlot || rawSlot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return { sqrtPriceX96: 0n, tick: 0 }
    }
    return decodeSlot0(rawSlot)
  }, [rawSlot])

  return {
    sqrtPriceX96: decoded.sqrtPriceX96,
    tick: decoded.tick,
    price: decoded.sqrtPriceX96 > 0n ? sqrtPriceToPrice(decoded.sqrtPriceX96) : null,
    priceFormatted: formatPoolPrice(decoded.sqrtPriceX96),
    loaded: !isLoading && decoded.sqrtPriceX96 > 0n,
    isRefetching,
  }
}
