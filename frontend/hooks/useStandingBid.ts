'use client'
import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI } from '@/lib/abis'
import { formatUSD, formatPercent, formatPercentFraction } from '@/lib/format'

export function useStandingBid(poolId: `0x${string}` | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'standingBids',
    args: poolId ? [poolId] : undefined,
    chainId: 1301,
    query: { enabled: !!poolId && !!ADDRESSES.PrismHook, refetchInterval: 10_000 },
  })

  return useMemo(() => {
    if (!data) return {
      exists: false, active: false, bidder: undefined,
      pricePerUnit: 0n, feeShareBps: 0, feeSharePercent: '--',
      maxCollateral: '--', usedCollateral: '--', remainingCollateral: '--',
      utilizationPercent: 0, isLoading, error: error ? String(error) : null,
    }

    const d = data as unknown as { bidder: `0x${string}`; pricePerUnit: bigint; feeShareBpsLPD: bigint; maxCollateral: bigint; usedCollateral: bigint; active: boolean }
    const { bidder, pricePerUnit, feeShareBpsLPD, maxCollateral, usedCollateral, active } = d

    const remaining = maxCollateral - usedCollateral
    const utilPct = maxCollateral > 0n ? Number((usedCollateral * 100n) / maxCollateral) : 0

    return {
      exists: active,
      active,
      bidder,
      pricePerUnit,
      feeShareBps: Number(feeShareBpsLPD),
      feeSharePercent: formatPercent(Number(feeShareBpsLPD)),
      coverageFraction: Number(pricePerUnit) / 1e18,
      coveragePercent: formatPercentFraction(Number(pricePerUnit) / 1e18),
      maxCollateral: formatUSD(maxCollateral, 6),
      usedCollateral: formatUSD(usedCollateral, 6),
      remainingCollateral: formatUSD(remaining, 6),
      utilizationPercent: utilPct,
      isLoading,
      error: error ? String(error) : null,
    }
  }, [data, isLoading, error])
}
