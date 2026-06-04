'use client'
import { useMemo } from 'react'
import { formatUSDNum } from '@/lib/format'

interface BidPreviewParams {
  pricePerUnit: number   // 0–1 fraction
  feeShareBps: number    // 0–10000
  maxCollateral: number  // USD
}

/** Client-side estimate only — labeled as such in UI. No contract call. */
export function useBidPreview({ pricePerUnit, feeShareBps, maxCollateral }: BidPreviewParams) {
  return useMemo(() => {
    if (!pricePerUnit || !maxCollateral) return null

    // Avg collateral per fill = maxCollateral * pricePerUnit (worst case maxIL coverage)
    const avgCostPerFill = maxCollateral * pricePerUnit
    const estimatedFills = avgCostPerFill > 0 ? Math.floor(maxCollateral / avgCostPerFill) : 0

    // Rough daily fee estimate: assume pool generates ~$50/day in fees, our share ∝ feeShareBps
    const estimatedDailyFees = 50 * (feeShareBps / 10000) * estimatedFills

    return {
      estimatedPositionsFillable: estimatedFills,
      avgCostPerPosition: formatUSDNum(avgCostPerFill),
      expectedDailyFees: formatUSDNum(estimatedDailyFees),
      capitalAtRisk: formatUSDNum(maxCollateral),
    }
  }, [pricePerUnit, feeShareBps, maxCollateral])
}
