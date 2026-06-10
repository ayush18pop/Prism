'use client'
/**
 * Prism Design System — 8 core UI primitives.
 * Zero external dependencies beyond React.
 * All colors via CSS variables only.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────
// 1. TokenPill
// ─────────────────────────────────────────────────────────────────
interface TokenPillProps { variant: 'lpy' | 'lpd' | 'vault' }

export function TokenPill({ variant }: TokenPillProps) {
  const map = {
    lpy:   { dot: 'var(--lpy-base)',   bg: 'var(--lpy-muted)',   border: 'var(--lpy-border)',   label: 'LP-Y' },
    lpd:   { dot: 'var(--lpd-base)',   bg: 'var(--lpd-muted)',   border: 'var(--lpd-border)',   label: 'LP-D' },
    vault: { dot: 'var(--vault-base)', bg: 'var(--vault-muted)', border: 'var(--vault-border)', label: 'VAULT' },
  }[variant]

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px',
      background: map.bg, border: `1px solid ${map.border}`,
      fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
      color: map.dot, lineHeight: 1,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: map.dot, flexShrink: 0 }} />
      {map.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// 2. SectionLabel
// ─────────────────────────────────────────────────────────────────
interface SectionLabelProps { label: string }

export function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span style={{
        fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-tertiary)',
        whiteSpace: 'nowrap',
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 3. StatCard
// ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  format?: 'usd' | 'percent' | 'raw'
  colorBySign?: boolean
  accent?: string // override color
  subtext?: string
}

export function StatCard({ label, value, format = 'raw', colorBySign = false, accent, subtext }: StatCardProps) {
  const display = React.useMemo(() => {
    if (value === '--' || value === null || value === undefined) return '--'
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''))
    if (isNaN(n)) return String(value)
    if (format === 'usd')     return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (format === 'percent') return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
    return String(value)
  }, [value, format])

  const color = React.useMemo(() => {
    if (accent) return accent
    if (!colorBySign) return 'var(--text-primary)'
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.\-]/g, ''))
    if (isNaN(n) || n === 0) return 'var(--text-primary)'
    return n > 0 ? 'var(--positive)' : 'var(--negative)'
  }, [value, colorBySign, accent])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 22, fontWeight: 400, color, lineHeight: 1 }}>
        {display}
      </span>
      {subtext && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{subtext}</span>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 4. StatusBadge
// ─────────────────────────────────────────────────────────────────
type StatusVariant = 'in-range' | 'out-of-range' | 'pending' | 'filled' | 'settled'

interface StatusBadgeProps { status: StatusVariant }

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<StatusVariant, { color: string; bg: string; border: string; label: string }> = {
    'in-range':    { color: 'var(--positive)',  bg: 'var(--positive-muted)', border: 'rgba(22,163,74,0.3)',  label: 'In Range' },
    'out-of-range':{ color: 'var(--negative)',  bg: 'var(--negative-muted)', border: 'rgba(220,38,38,0.3)',  label: 'Out of Range' },
    'pending':     { color: 'var(--warning)',   bg: 'var(--warning-muted)',  border: 'rgba(217,119,6,0.3)',  label: 'Pending' },
    'filled':      { color: 'var(--positive)',  bg: 'var(--positive-muted)', border: 'rgba(22,163,74,0.3)',  label: 'Filled' },
    'settled':     { color: 'var(--text-secondary)', bg: 'transparent', border: 'var(--border-default)', label: 'Settled' },
  }
  const s = map[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px',
      background: s.bg, border: `1px solid ${s.border}`,
      fontSize: 11, fontWeight: 500, color: s.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// 5. AddressChip
// ─────────────────────────────────────────────────────────────────
interface AddressChipProps { address: string; full?: boolean }

export function AddressChip({ address, full = false }: AddressChipProps) {
  const [copied, setCopied] = useState(false)

  const display = full ? address : `${address.slice(0, 6)}…${address.slice(-4)}`

  const copy = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [address])

  return (
    <button
      onClick={copy}
      aria-label={`Copy address ${address}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12,
        color: copied ? 'var(--positive)' : 'var(--text-tertiary)',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        transition: 'color 150ms',
      }}
    >
      {copied ? (
        // Checkmark SVG
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        // Copy SVG
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
          <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
        </svg>
      )}
      {copied ? 'copied' : display}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// 6. AmountInput
// ─────────────────────────────────────────────────────────────────
interface AmountInputProps {
  label: string
  value: string
  onChange: (v: string) => void
  tokenSymbol: string
  usdEstimate?: string
  accentColor?: string
  balance?: string
  onMax?: () => void
  disabled?: boolean
}

export function AmountInput({
  label, value, onChange, tokenSymbol, usdEstimate,
  accentColor = 'var(--border-strong)', balance, onMax, disabled,
}: AmountInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          {label}
        </label>
        {balance !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>
              {balance}
            </span>
            {onMax && (
              <button
                onClick={onMax}
                style={{
                  fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                MAX
              </button>
            )}
          </div>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-raised)',
        border: `1px solid ${focused ? accentColor : 'var(--border-default)'}`,
        padding: '10px 14px',
        transition: 'border-color 150ms',
      }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          placeholder="0.00"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 18,
            color: 'var(--text-primary)', width: '100%',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12,
          color: 'var(--text-secondary)', marginLeft: 8, flexShrink: 0,
        }}>
          {tokenSymbol}
        </span>
      </div>
      {usdEstimate && (
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>
          ≈ {usdEstimate}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 7. SplitVisualizer
// ─────────────────────────────────────────────────────────────────
interface SplitVisualizerProps {
  lpyValue: number
  lpdValue: number
  vaultValue: number
  animated?: boolean
  size?: 'sm' | 'lg'
}

export function SplitVisualizer({ lpyValue, lpdValue, vaultValue, animated = false, size = 'lg' }: SplitVisualizerProps) {
  const [played, setPlayed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animated) return
    const t = setTimeout(() => setPlayed(true), 50)
    return () => clearTimeout(t)
  }, [animated])

  const total = lpyValue + lpdValue || 1
  const lpyPct = (lpyValue / total) * 100
  const lpdPct = (lpdValue / total) * 100

  const h = size === 'lg' ? 120 : 60
  const barH = size === 'lg' ? 76 : 36
  const vaultH = size === 'lg' ? 20 : 12
  const gap = size === 'lg' ? 8 : 4
  const showLabels = size === 'lg'

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const isAnimating = animated && !played

  return (
    <div ref={ref} style={{ width: '100%', height: h + vaultH + gap, position: 'relative', userSelect: 'none' }}>
      {/* Main bar: LP-Y + LP-D */}
      <div style={{ display: 'flex', width: '100%', height: barH, position: 'relative' }}>
        {/* LP-Y bar */}
        <div
          onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: `LP-Y · $${lpyValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} · fees + zero IL` })}
          onMouseLeave={() => setTooltip(null)}
          style={{
            width: isAnimating ? '100%' : `${lpyPct}%`,
            height: '100%',
            background: isAnimating ? 'var(--border-strong)' : 'var(--lpy-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', cursor: 'default',
            transition: animated && played ? 'width 400ms ease-out, background 400ms ease-out' : 'none',
          }}
        >
          {showLabels && lpyPct > 15 && (
            <span style={{ fontSize: 11, fontWeight: 500, color: '#080808', letterSpacing: '0.05em', zIndex: 1 }}>
              LP-Y
            </span>
          )}
        </div>
        {/* LP-D bar */}
        <div
          onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: `LP-D · $${lpdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} · IL absorbed + fee share` })}
          onMouseLeave={() => setTooltip(null)}
          style={{
            width: isAnimating ? '0%' : `${lpdPct}%`,
            height: '100%',
            background: 'var(--lpd-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', cursor: 'default',
            transition: animated && played ? 'width 400ms ease-out 100ms' : 'none',
            opacity: isAnimating ? 0 : 1,
          }}
        >
          {showLabels && lpdPct > 15 && (
            <span style={{ fontSize: 11, fontWeight: 500, color: '#F2F2F2', letterSpacing: '0.05em', zIndex: 1 }}>
              LP-D
            </span>
          )}
        </div>
      </div>

      {/* Vault bar */}
      <div
        onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: `Vault · $${vaultValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} · USDC collateral locked` })}
        onMouseLeave={() => setTooltip(null)}
        style={{
          marginTop: gap,
          width: '100%', height: vaultH,
          background: 'var(--vault-base)',
          display: 'flex', alignItems: 'center',
          paddingLeft: 8, cursor: 'default',
          opacity: isAnimating ? 0 : 1,
          transition: animated && played ? 'opacity 200ms ease-out 500ms' : 'none',
        }}
      >
        {showLabels && (
          <span style={{ fontSize: 10, fontWeight: 500, color: '#F2F2F2', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            VAULT
          </span>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 8,
          background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
          padding: '6px 10px', fontSize: 11, color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
          pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 8. BidStatusBanner
// ─────────────────────────────────────────────────────────────────
interface BidObject {
  pricePerUnit: number    // 0–1 WAD fraction
  feeShareBps: number
  maxCollateral: string
  usedCollateral: string
  remainingCollateral: string
}

interface BidStatusBannerProps {
  status: 'active' | 'none'
  bid?: BidObject | null
}

export function BidStatusBanner({ status, bid }: BidStatusBannerProps) {
  if (status === 'active' && bid) {
    return (
      <div style={{
        borderLeft: '3px solid rgba(22,163,74,0.6)',
        borderTop: '1px solid rgba(22,163,74,0.25)',
        borderRight: '1px solid rgba(22,163,74,0.25)',
        borderBottom: '1px solid rgba(22,163,74,0.25)',
        background: 'var(--positive-muted)',
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Checkmark */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="var(--positive)" strokeWidth="1.5" />
            <polyline points="5,9 8,12 13,6" stroke="var(--positive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--positive)', lineHeight: 1.2 }}>
              Standing bid active
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Your LP-D will be auto-sold on deposit. You hold LP-Y only.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'Coverage', value: `${(bid.pricePerUnit * 100).toFixed(0)}%` },
            { label: 'Fee Share', value: `${(bid.feeShareBps / 100).toFixed(1)}%` },
            { label: 'Budget Remaining', value: bid.remainingCollateral },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 15, color: 'var(--positive)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      borderLeft: '3px solid rgba(217,119,6,0.6)',
      borderTop: '1px solid rgba(217,119,6,0.25)',
      borderRight: '1px solid rgba(217,119,6,0.25)',
      borderBottom: '1px solid rgba(217,119,6,0.25)',
      background: 'var(--warning-muted)',
      padding: '16px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      {/* Warning icon */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d="M9 2L16.5 15H1.5L9 2Z" stroke="var(--warning)" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="9" y1="7" x2="9" y2="11" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9" cy="13" r="0.75" fill="var(--warning)" />
      </svg>
      <div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--warning)', lineHeight: 1.2 }}>
          No standing bid
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          You will receive LP-Y and LP-D.{' '}
          <a href="/app/lpd" style={{ color: 'var(--warning)', textDecoration: 'underline' }}>
            Set a bid on the LP-D page
          </a>
          {' '}to enable automatic IL coverage.
        </div>
      </div>
    </div>
  )
}
