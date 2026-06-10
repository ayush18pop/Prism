'use client'
import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { useQueries } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { formatUSD, formatPercent } from '@/lib/format'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI } from '@/lib/abis'

export interface BidWithId {
  bidId: bigint
  bidder: `0x${string}`
  pricePerUnit: bigint
  feeShareBpsLPD: number
  ilCoverageBps: number
  maxCollateral: bigint
  usedCollateral: bigint
  remaining: bigint
  active: boolean
  score: number
  coveragePercent: string
  feeSharePercent: string
  maxCollateralFormatted: string
  remainingFormatted: string
}

type RawBid = {
  bidder: `0x${string}`
  pricePerUnit: bigint
  feeShareBpsLPD: bigint
  ilCoverageBps: bigint
  maxCollateral: bigint
  usedCollateral: bigint
  active: boolean
}

function hydrate(bidId: bigint, raw: RawBid): BidWithId {
  const feeShareBpsLPD = Number(raw.feeShareBpsLPD)
  const ilCoverageBps = Number(raw.ilCoverageBps)
  const remaining = raw.maxCollateral - raw.usedCollateral
  return {
    bidId,
    bidder: raw.bidder,
    pricePerUnit: raw.pricePerUnit,
    feeShareBpsLPD,
    ilCoverageBps,
    maxCollateral: raw.maxCollateral,
    usedCollateral: raw.usedCollateral,
    remaining,
    active: raw.active,
    score: Math.floor(ilCoverageBps * (10000 - feeShareBpsLPD) / 10000),
    coveragePercent: formatPercent(ilCoverageBps),
    feeSharePercent: formatPercent(feeShareBpsLPD),
    maxCollateralFormatted: formatUSD(raw.maxCollateral, 6),
    remainingFormatted: formatUSD(remaining, 6),
  }
}

/** Reads all bids 0..nextBidId-1 in parallel. */
export function useAllBids(poolId: `0x${string}` | undefined) {
  const client = usePublicClient({ chainId: 1301 })

  const { data: nextId, isLoading: countLoading } = useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'nextBidId',
    args: poolId ? [poolId] : undefined,
    chainId: 1301,
    query: { enabled: !!poolId && !!ADDRESSES.PrismHook, refetchInterval: 15_000 },
  })

  const count = nextId != null ? Number(nextId as bigint) : 0

  // Build one query per bid index, all in parallel
  const bidQueries = useQueries({
    queries: Array.from({ length: count }, (_, i) => ({
      queryKey: ['bid', ADDRESSES.PrismHook, poolId, i],
      queryFn: async (): Promise<BidWithId | null> => {
        if (!client || !poolId || !ADDRESSES.PrismHook) return null
        const raw = await client.readContract({
          address: ADDRESSES.PrismHook!,
          abi: PRISM_HOOK_ABI,
          functionName: 'bids',
          args: [poolId, BigInt(i)],
        }) as RawBid
        return hydrate(BigInt(i), raw)
      },
      enabled: !!client && !!poolId && !!ADDRESSES.PrismHook && count > 0,
      refetchInterval: 15_000,
      staleTime: 10_000,
    })),
  })

  const isLoading = countLoading || bidQueries.some(q => q.isLoading)

  const bids = useMemo(() => {
    return bidQueries
      .map(q => q.data)
      .filter((b): b is BidWithId => b !== null && b !== undefined)
  }, [bidQueries])

  return { bids, isLoading, count }
}

/** All active bids for this wallet address. */
export function useMyBids(poolId: `0x${string}` | undefined, address: `0x${string}` | undefined) {
  const { bids, isLoading } = useAllBids(poolId)
  const myBids = useMemo(
    () => bids.filter(b => b.active && address && b.bidder.toLowerCase() === address.toLowerCase()),
    [bids, address],
  )
  return { bids: myBids, isLoading }
}

/**
 * The highest-scoring active bid — what the hook auto-selects for the next deposit.
 * Replicates contract scoring: ilCoverageBps × (10000 − feeShareBpsLPD) / 10000.
 */
export function useWinningBid(poolId: `0x${string}` | undefined): BidWithId | null {
  const { bids } = useAllBids(poolId)
  return useMemo(() => {
    const active = bids.filter(b => b.active && b.remaining > 0n)
    if (active.length === 0) return null
    return active.reduce((best, b) => b.score > best.score ? b : best)
  }, [bids])
}
