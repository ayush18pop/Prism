'use client'

import { useEffect, useState } from 'react'
import { ADDRESSES } from '@/lib/addresses'
import { usePoolInitialized } from '@/hooks/usePoolInitialized'
import { useAllBids } from '@/hooks/useAllBids'
import { usePositionLogs } from '@/hooks/usePrismHook'

/** Live chain data strip — the landing page proves the protocol is real.
 *  Polls Unichain Sepolia every 5s through the existing read hooks. */
export function LiveTicker() {
  // Avoid SSR/client hydration mismatch — render placeholders until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pool = usePoolInitialized(mounted ? ADDRESSES.poolId : undefined)
  const { bids } = useAllBids(mounted ? ADDRESSES.poolId : undefined)
  const { data: logs } = usePositionLogs()

  const activeBids = bids?.filter((b) => b.active).length
  const items: [string, string][] = [
    ['PRISM',     mounted && pool.initialized ? pool.priceFormatted : '—'],
    ['TICK',      mounted && pool.initialized ? String(pool.tick) : '—'],
    ['OPEN BIDS', mounted && activeBids != null ? String(activeBids) : '—'],
    ['POSITIONS', mounted && logs ? String(logs.length) : '—'],
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0, flexWrap: 'wrap',
      border: '1px solid var(--border-subtle)',
      background: 'rgba(255,255,255,0.012)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px',
        borderRight: '1px solid var(--border-subtle)',
      }}>
        <span className="ticker-dot" />
        <span style={{
          fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
          fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)',
        }}>
          LIVE · UNICHAIN SEPOLIA
        </span>
      </div>
      {items.map(([label, value], i) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          padding: '10px 18px',
          borderRight: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
        }}>
          <span style={{
            fontSize: 9, fontWeight: 500, letterSpacing: '0.12em',
            color: 'var(--text-tertiary)',
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 12, color: 'var(--text-secondary)',
          }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}
