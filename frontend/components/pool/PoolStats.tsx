'use client'

import { useReadContract } from 'wagmi'
import { ADDRESSES } from '@/lib/addresses'
import { sqrtPriceX96ToPrice } from '@/lib/ilMath'

const POOL_MANAGER_ABI = [
  { name: 'getSlot0', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }, { name: 'protocolFee', type: 'uint24' }, { name: 'lpFee', type: 'uint24' }] },
] as const

interface PoolStatsProps {
  poolId: `0x${string}` | undefined
}

export function PoolStats({ poolId }: PoolStatsProps) {
  const { data: slot0 } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: POOL_MANAGER_ABI,
    functionName: 'getSlot0',
    args: poolId ? [poolId] : undefined,
    chainId: 1301,
    query: { enabled: !!poolId && !!ADDRESSES.PoolManager, refetchInterval: 5_000 },
  })

  const sqrtPrice = slot0?.[0]
  const tick      = slot0?.[1]
  const price     = sqrtPrice ? sqrtPriceX96ToPrice(sqrtPrice) : null

  return (
    <div className="relative liquid-glass rounded-2xl px-6 py-6 overflow-hidden">
      {/* Violet glow behind the panel */}
      <div className="absolute -inset-px rounded-2xl bg-violet-500/5 blur-xl pointer-events-none" />

      {/* Header row */}
      <div className="relative flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs text-white/60 uppercase tracking-[0.2em]">Live · Unichain Sepolia · 1s blocks</p>
        </div>
        {/* Signal bars decoration */}
        <div className="ml-auto flex items-end gap-0.5 h-4">
          {[0.35, 0.55, 0.75, 1].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-sm bg-emerald-400/60 animate-pulse"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* Hero stat — Pool Price */}
      <div className="relative mb-5">
        <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Pool Price</p>
        {price != null ? (
          <p className="font-mono text-2xl text-white leading-none">
            ${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        ) : (
          <div className="h-8 w-36 rounded-lg bg-white/5 animate-pulse" />
        )}
      </div>

      {/* Secondary stats */}
      <div className="relative flex gap-8 border-t border-white/5 pt-4">
        <SecondaryStatItem label="Current Tick" value={tick != null ? tick.toString() : null} />
        <SecondaryStatItem
          label="Sqrt Price"
          value={sqrtPrice ? `${(Number(sqrtPrice) / 1e18).toFixed(4)}e18` : null}
        />
      </div>
    </div>
  )
}

function SecondaryStatItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-1.5">{label}</p>
      {value != null ? (
        <p className="font-mono text-sm text-white/60">{value}</p>
      ) : (
        <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
      )}
    </div>
  )
}
