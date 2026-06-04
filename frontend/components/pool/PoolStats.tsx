'use client'

import { sqrtPriceX96ToPrice } from '@/lib/ilMath'
import { usePoolState } from '@/hooks/usePoolState'

// poolId prop retained for API compatibility but the hook reads ADDRESSES.poolId internally
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PoolStatsProps { poolId: `0x${string}` | undefined }

export function PoolStats({ poolId: _poolId }: PoolStatsProps) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const { sqrtPriceX96, tick, loaded } = usePoolState()

  const sqrtPrice = loaded ? sqrtPriceX96 : undefined
  const price     = sqrtPrice ? sqrtPriceX96ToPrice(sqrtPrice) : null

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.05]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-[10px] text-white/35 uppercase tracking-[0.2em]">Live · Unichain Sepolia · 1s blocks</p>
        <div className="ml-auto flex items-end gap-0.5 h-3.5">
          {[0.35, 0.55, 0.8, 1].map((h, i) => (
            <div
              key={i}
              className="w-0.5 rounded-sm bg-emerald-400/50 animate-pulse"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.05]">
        <StatCell label="Pool Price" large>
          {price != null ? (
            <span className="font-mono text-3xl text-white leading-none">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
            </span>
          ) : (
            <Skeleton className="h-9 w-40" />
          )}
        </StatCell>

        <StatCell label="Current Tick">
          {tick != null ? (
            <span className="font-mono text-xl text-white">{tick.toLocaleString()}</span>
          ) : (
            <Skeleton className="h-7 w-20" />
          )}
        </StatCell>

        <StatCell label="Pair">
          <span className="font-mono text-sm text-white">USDC / PRISM</span>
        </StatCell>

        <StatCell label="Fee Tier">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white">0.01%</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20">tick 1</span>
          </div>
        </StatCell>
      </div>
    </div>
  )
}

function StatCell({ label, children, large }: { label: string; children: React.ReactNode; large?: boolean }) {
  return (
    <div className={`px-6 ${large ? 'py-6' : 'py-5'} flex flex-col gap-2`}>
      <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">{label}</p>
      {children}
    </div>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div className={`rounded-lg bg-white/5 animate-pulse ${className}`} />
}
