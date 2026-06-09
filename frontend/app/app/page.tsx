'use client'

import { useWatchContractEvent } from 'wagmi'
import { parseAbiItem } from 'viem'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ADDRESSES } from '@/lib/addresses'
import { TokenPill, SectionLabel, AddressChip } from '@/components/ui/index'
import { PrismSplitAnimation } from '@/components/landing/PrismSplitAnimation'
import { usePoolPrice } from '@/hooks/usePoolPrice'
import { useStandingBid } from '@/hooks/useStandingBid'
import { formatTimeAgo } from '@/lib/format'

const POSITION_OPENED = parseAbiItem(
  'event PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 collateral)'
)

interface PoolEvent {
  posId: string
  collateral: bigint
  timestamp: number
  txHash: string
}

const BLOCKSCOUT = 'https://unichain-sepolia.blockscout.com/tx/'

const STEP_ACCENTS = ['var(--lpy-base)', 'var(--lpd-base)', 'var(--positive)']

export default function PoolPage() {
  const { priceFormatted, tick, loaded, isRefetching } = usePoolPrice()
  const bid = useStandingBid(ADDRESSES.poolId)
  const [events, setEvents] = useState<PoolEvent[]>([])

  // Price change flash
  const prevPriceRef = useRef<string | null>(null)
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null)
  const [priceDir, setPriceDir] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (!priceFormatted || priceFormatted === '--') return
    if (prevPriceRef.current && prevPriceRef.current !== priceFormatted) {
      const prev = parseFloat(prevPriceRef.current.replace(/[$,]/g, ''))
      const curr = parseFloat(priceFormatted.replace(/[$,]/g, ''))
      const dir = curr >= prev ? 'up' : 'down'
      setPriceFlash(dir)
      setPriceDir(dir)
      const t1 = setTimeout(() => setPriceFlash(null), 600)
      const t2 = setTimeout(() => setPriceDir(null), 1400)
      prevPriceRef.current = priceFormatted
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    prevPriceRef.current = priceFormatted
  }, [priceFormatted])

  // Hover states
  const [hoveredStat, setHoveredStat] = useState<string | null>(null)
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null)

  // Blinking cursor for empty events
  const [cursorVisible, setCursorVisible] = useState(true)
  useEffect(() => {
    const t = setInterval(() => setCursorVisible(v => !v), 530)
    return () => clearInterval(t)
  }, [])

  const lpyFeePct = bid.active ? 100 - (bid.feeShareBps / 100) : 70
  const lpdFeePct = bid.active ? bid.feeShareBps / 100 : 30

  useWatchContractEvent({
    address: ADDRESSES.PrismHook,
    abi: [POSITION_OPENED],
    eventName: 'PositionOpened',
    chainId: 1301,
    onLogs: (logs) => {
      const newEvents = logs.map(l => ({
        posId: l.args.posId as string,
        collateral: (l.args.collateral ?? 0n) as bigint,
        timestamp: Math.floor(Date.now() / 1000),
        txHash: l.transactionHash ?? '',
      }))
      setEvents(prev => [...newEvents, ...prev].slice(0, 20))
    },
  })

  const stats = [
    { key: 'price', label: 'POOL PRICE', value: loaded ? priceFormatted : '--', mono: true, large: true },
    { key: 'tick',  label: 'TICK',       value: loaded ? String(tick) : '--',    mono: true, large: false },
    { key: 'pair',  label: 'PAIR',       value: 'USDC / PRISM',                 mono: true, large: false },
    { key: 'fee',   label: 'FEE',        value: '0.05%',                        mono: true, large: false },
  ]

  return (
    <div>
      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        padding: '0 24px', height: 80, marginBottom: 32,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24, borderRight: '1px solid var(--border-subtle)', marginRight: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--positive)', animation: 'live-pulse 2s ease-in-out infinite' }} />
          <span className="text-label" style={{ color: 'var(--text-tertiary)' }}>LIVE · 1S BLOCKS</span>
        </div>

        {/* Stats with hover effect */}
        {stats.map((s, i) => (
          <div
            key={s.key}
            onMouseEnter={() => setHoveredStat(s.key)}
            onMouseLeave={() => setHoveredStat(null)}
            style={{
              paddingRight: i < stats.length - 1 ? 32 : 0,
              borderRight: i < stats.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              marginRight: i < stats.length - 1 ? 32 : 0,
              cursor: 'default',
              transition: 'opacity 150ms',
              opacity: hoveredStat && hoveredStat !== s.key ? 0.5 : 1,
            }}
          >
            <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>{s.label}</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: s.large ? 22 : 15, fontWeight: 400,
              color: s.key === 'price' && priceFlash
                ? (priceFlash === 'up' ? 'var(--positive)' : 'var(--negative)')
                : 'var(--text-primary)',
              transform: hoveredStat === s.key ? 'translateY(-1px)' : 'none',
              transition: 'color 300ms ease, transform 150ms ease',
            }}>
              {s.value}
              {/* Price direction arrow */}
              {s.key === 'price' && priceDir && (
                <span style={{
                  fontSize: 12,
                  color: priceDir === 'up' ? 'var(--positive)' : 'var(--negative)',
                  opacity: priceFlash ? 1 : 0,
                  transition: 'opacity 400ms ease',
                }}>
                  {priceDir === 'up' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Refetch progress line */}
        {isRefetching && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--lpy-base)', opacity: 0.4, animation: 'progress-opt 2s linear forwards' }} />
        )}
      </div>

      {/* ── Two column layout ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 32 }}>

        {/* LEFT: Educational card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 32 }}>
          <h2 className="text-heading" style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
            Every deposit, automatically split.
          </h2>
          <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your LP position becomes two tokens the moment you confirm.
            LP-Y earns fees. LP-D absorbs price risk. Whoever holds LP-D posts USDC collateral.
          </p>

          {/* Prism split animation */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
            <PrismSplitAnimation />
            {bid.active && (
              <p style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12 }}>
                fee split: LP-Y&nbsp;
                <span style={{ color: 'var(--lpy-base)' }}>{lpyFeePct.toFixed(0)}%</span>
                &nbsp;·&nbsp;LP-D&nbsp;
                <span style={{ color: 'var(--lpd-base)' }}>{lpdFeePct.toFixed(0)}%</span>
                <span style={{ color: 'var(--positive)', marginLeft: 8 }}>● bid active</span>
              </p>
            )}
          </div>

          {/* Legend — hover to highlight each token */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16, borderBottom: '1px solid var(--border-subtle)' }}>
            {[
              { variant: 'lpy' as const,   desc: 'earns swap fees, zero IL at exit',                    accent: 'var(--lpy-border)' },
              { variant: 'lpd' as const,   desc: 'absorbs all IL, earns fee share + posts collateral', accent: 'var(--lpd-border)' },
              { variant: 'vault' as const, desc: 'USDC pre-deposited by the LP-D buyer, drawn at settlement', accent: 'var(--vault-border)' },
            ].map(({ variant, desc, accent }) => {
              const isHovered = hoveredLegend === variant
              return (
                <div
                  key={variant}
                  onMouseEnter={() => setHoveredLegend(variant)}
                  onMouseLeave={() => setHoveredLegend(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 8px',
                    marginLeft: -8,
                    background: isHovered ? 'var(--bg-raised)' : 'transparent',
                    borderLeft: `2px solid ${isHovered ? accent : 'transparent'}`,
                    transition: 'background 150ms, border-color 150ms',
                    cursor: 'default',
                  }}
                >
                  <TokenPill variant={variant} />
                  <span className="text-small" style={{
                    color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'color 150ms',
                  }}>
                    {desc}
                  </span>
                </div>
              )
            })}
          </div>

          {/* 3 steps — hover with accent left border + color animation */}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
            {[
              { n: '01', title: 'Deposit', body: 'LP provides liquidity in a tick range. Hook fires on every afterAddLiquidity.', accent: STEP_ACCENTS[0] },
              { n: '02', title: 'Split',   body: 'LP-Y minted to LP. LP-D auto-sold to protocol if a standing bid matches.', accent: STEP_ACCENTS[1] },
              { n: '03', title: 'Earn',    body: 'LP-Y collects fees with zero IL. LP-D earns fee share and absorbs price risk.', accent: STEP_ACCENTS[2] },
            ].map(({ n, title, body, accent }) => {
              const isHovered = hoveredStep === n
              return (
                <div
                  key={n}
                  onMouseEnter={() => setHoveredStep(n)}
                  onMouseLeave={() => setHoveredStep(null)}
                  style={{
                    display: 'flex', gap: 16, padding: '14px 8px',
                    paddingLeft: 12,
                    borderBottom: '1px solid var(--border-subtle)',
                    borderLeft: `2px solid ${isHovered ? accent : 'transparent'}`,
                    marginLeft: -8,
                    background: isHovered ? 'var(--bg-raised)' : 'transparent',
                    transition: 'background 150ms, border-color 150ms',
                    cursor: 'default',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 12, flexShrink: 0, paddingTop: 2,
                    color: isHovered ? accent : 'var(--text-tertiary)',
                    transition: 'color 150ms',
                  }}>
                    {n}
                  </span>
                  <div>
                    <div className="text-body" style={{
                      fontWeight: 500, marginBottom: 2,
                      color: isHovered ? 'var(--text-primary)' : 'var(--text-primary)',
                    }}>
                      {title}
                    </div>
                    <div className="text-small" style={{
                      color: isHovered ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                      transition: 'color 150ms',
                    }}>
                      {body}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Protocol Events */}
        <div>
          <SectionLabel label="PROTOCOL EVENTS" />
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
            {events.length === 0 ? (
              /* Waiting state — blinking cursor, not just "no data" */
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8,
                }}>
                  listening on-chain<span style={{ opacity: cursorVisible ? 1 : 0, transition: 'opacity 80ms' }}>_</span>
                </div>
                <div className="text-small" style={{ color: 'var(--text-tertiary)' }}>
                  deposits to this pool will appear here
                </div>
                {/* Subtle pulse dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                  {[0, 200, 400].map(delay => (
                    <span key={delay} style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'var(--border-strong)',
                      display: 'inline-block',
                      animation: `live-pulse 2s ease-in-out ${delay}ms infinite`,
                    }} />
                  ))}
                </div>
              </div>
            ) : (
              events.map((ev, i) => (
                <div
                  key={ev.posId + i}
                  className="event-entry"
                  onMouseEnter={() => setHoveredEvent(ev.posId)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < events.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    borderLeft: `2px solid ${hoveredEvent === ev.posId ? (ev.collateral > 0n ? 'var(--positive)' : 'var(--border-subtle)') : 'transparent'}`,
                    background: hoveredEvent === ev.posId ? 'var(--bg-raised)' : i === 0 ? 'var(--bg-raised)' : 'var(--bg-surface)',
                    transition: 'background 150ms, border-color 150ms',
                    cursor: 'default',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: ev.collateral > 0n ? 'var(--positive)' : 'var(--text-tertiary)',
                    boxShadow: hoveredEvent === ev.posId && ev.collateral > 0n ? '0 0 6px var(--positive)' : 'none',
                    transition: 'box-shadow 200ms',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="text-body" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Position Opened</span>
                        <AddressChip address={ev.posId} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>{formatTimeAgo(ev.timestamp)}</span>
                        {ev.txHash && (
                          <a href={BLOCKSCOUT + ev.txHash} target="_blank" rel="noopener noreferrer"
                            style={{
                              fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none',
                              opacity: hoveredEvent === ev.posId ? 1 : 0.4,
                              transition: 'opacity 150ms',
                            }}>
                            ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-small" style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {ev.collateral > 0n ? (
                        <span style={{ color: 'var(--positive)' }}>
                          ✓ <TokenPill variant="lpd" /> auto-sold
                        </span>
                      ) : (
                        <span>no standing bid</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Deployed contracts */}
          <div style={{ marginTop: 24, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-label" style={{ color: 'var(--text-tertiary)', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              DEPLOYED CONTRACTS
            </div>
            {[
              { label: 'PrismHook', addr: ADDRESSES.PrismHook },
              { label: 'PrismRouter', addr: ADDRESSES.PrismRouter },
            ].filter(c => c.addr).map(({ label, addr }) => {
              const rowKey = label
              return (
                <div
                  key={rowKey}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px',
                    background: hoveredStat === rowKey ? 'var(--bg-overlay)' : 'transparent',
                    transition: 'background 150ms',
                    cursor: 'default',
                  }}
                  onMouseEnter={() => setHoveredStat(rowKey)}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <span className="text-small" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <AddressChip address={addr!} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
