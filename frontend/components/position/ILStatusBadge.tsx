'use client'

import { cn } from '@/lib/utils'
import { computeILFraction } from '@/lib/ilMath'

interface ILStatusBadgeProps {
  entrySqrtPrice: bigint
  currentSqrtPrice: bigint
  lpDSold?: boolean
  size?: 'sm' | 'lg'
}

export function ILStatusBadge({ entrySqrtPrice, currentSqrtPrice, lpDSold, size = 'sm' }: ILStatusBadgeProps) {
  const frac = computeILFraction(entrySqrtPrice, currentSqrtPrice)
  const isNegative = frac < 0
  const pct = Math.abs(frac) * 100

  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full font-medium',
    size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs',
  )

  if (lpDSold) {
    return (
      <span className={cn(base, 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        $0 IL Protected
      </span>
    )
  }

  if (!isNegative) {
    return (
      <span className={cn(base, 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')}>
        +{pct.toFixed(2)}%
      </span>
    )
  }

  const variant = pct > 10
    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'

  return (
    <span className={cn(base, variant)}>
      {isNegative ? `−${pct.toFixed(2)}% IL` : `+${pct.toFixed(2)}%`}
    </span>
  )
}
