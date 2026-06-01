import { cn } from '@/lib/utils'
import { computeILFraction } from '@/lib/ilMath'

interface ILStatusBadgeProps {
  entrySqrtPrice: bigint
  currentSqrtPrice: bigint
}

export function ILStatusBadge({ entrySqrtPrice, currentSqrtPrice }: ILStatusBadgeProps) {
  const frac = computeILFraction(entrySqrtPrice, currentSqrtPrice)
  const isNegative = frac < 0
  const pct = Math.abs(frac) * 100

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      isNegative
        ? pct > 10 ? 'bg-red-950/60 text-red-400' : 'bg-amber-950/60 text-amber-400'
        : 'bg-emerald-950/60 text-emerald-400',
    )}>
      {isNegative ? `−${pct.toFixed(2)}% IL` : `+${pct.toFixed(2)}% gain`}
    </span>
  )
}
