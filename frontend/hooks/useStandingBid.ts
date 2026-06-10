'use client'
import { useAllBids, useWinningBid } from '@/hooks/useAllBids'

/**
 * Returns the winning bid (highest-scoring active bid) for the pool.
 * Used by BidStatusBanner on the provide page: tells the LP whether their
 * next deposit will be auto-covered, and at what terms.
 *
 * NOT "my bid" — use useMyBids(poolId, address) for wallet-specific bids.
 */
export function useStandingBid(poolId: `0x${string}` | undefined) {
  const { isLoading } = useAllBids(poolId)
  const winning = useWinningBid(poolId)

  return {
    active: !!winning,
    bidder: winning?.bidder,
    pricePerUnit: winning?.pricePerUnit ?? 0n,
    feeShareBps: winning?.feeShareBpsLPD ?? 0,
    feeSharePercent: winning?.feeSharePercent ?? '--',
    coverageFraction: winning ? winning.ilCoverageBps / 10000 : 0,
    coveragePercent: winning?.coveragePercent ?? '--',
    maxCollateral: winning?.maxCollateralFormatted ?? '--',
    usedCollateral: '--',
    remainingCollateral: winning?.remainingFormatted ?? '--',
    utilizationPercent: 0,
    isLoading,
    error: null,
  }
}
