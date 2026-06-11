'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const TABS = [
  { label: 'Pool',    href: '/app' },
  { label: 'Provide', href: '/app/provide' },
  { label: 'Trade',   href: '/app/trade' },
  { label: 'LP-D',    href: '/app/lpd' },
  { label: 'Faucet',  href: '/app/faucet' },
]

const TAB_ACCENT: Record<string, { bg: string; border: string; color: string }> = {
  '/app/provide': { bg: 'rgba(240,180,41,0.07)', border: 'rgba(240,180,41,0.22)', color: '#D97706' },
  '/app/lpd':     { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)', color: '#9B6DFF' },
}

export function TabNav() {
  const path = usePathname()

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Main row */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', width: '100%',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px', height: 52,
      }}>
        {/* Left: logo + tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <a href="/" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 13, fontWeight: 600, letterSpacing: '0.1em',
            color: 'var(--text-primary)', textDecoration: 'none',
            paddingRight: 20, marginRight: 8,
            borderRight: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <polygon points="8,1.5 14.5,13.5 1.5,13.5" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" strokeLinejoin="round" />
              <line x1="1.5" y1="13.5" x2="0" y2="16" stroke="#F0B429" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="8" y1="13.5" x2="8" y2="16" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14.5" y1="13.5" x2="16" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            PRISM
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {TABS.map(tab => {
              const active = tab.href === '/app' ? path === '/app' : path.startsWith(tab.href)
              const accent = TAB_ACCENT[tab.href]
              const tabBg     = active && accent ? accent.bg     : active ? 'var(--bg-raised)' : 'transparent'
              const tabBorder = active && accent ? accent.border : active ? 'var(--border-default)' : 'transparent'
              const tabColor  = active && accent ? accent.color  : active ? 'var(--text-primary)' : 'var(--text-tertiary)'

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '5px 12px',
                    margin: '0 1px',
                    fontSize: 13, fontWeight: active ? 500 : 400,
                    color: tabColor,
                    textDecoration: 'none',
                    background: tabBg,
                    border: `1px solid ${tabBorder}`,
                    transition: 'color 120ms, background 120ms, border-color 120ms',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = 'var(--text-secondary)'
                      el.style.background = 'rgba(255,255,255,0.03)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = 'var(--text-tertiary)'
                      el.style.background = 'transparent'
                    }
                  }}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right: network indicator + wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--positive)',
              animation: 'live-pulse 2s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              color: 'var(--text-tertiary)', letterSpacing: '0.06em',
            }}>
              UNICHAIN SEPOLIA
            </span>
          </div>
          <ConnectButton chainStatus="none" showBalance={false} />
        </div>
      </div>

      {/* Spectrum separator */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, rgba(240,180,41,0.35) 0%, rgba(255,255,255,0.1) 35%, rgba(255,255,255,0.1) 65%, rgba(124,58,237,0.35) 100%)',
      }} />
    </nav>
  )
}
