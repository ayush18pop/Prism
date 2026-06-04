'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const TABS = [
  { label: 'Pool',    href: '/app' },
  { label: 'Provide', href: '/app/provide' },
  { label: 'Trade',   href: '/app/trade' },
  { label: 'LP-D',    href: '/app/lpd' },
]

export function TabNav() {
  const path = usePathname()

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border-default)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', alignItems: 'stretch',
        justifyContent: 'space-between', padding: '0 24px', height: 52,
      }}>
        {/* Left: logo + tabs */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          <a href="/" style={{
            display: 'flex', alignItems: 'center',
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 14, fontWeight: 500, letterSpacing: '0.08em',
            color: 'var(--text-primary)', textDecoration: 'none',
            paddingRight: 24, marginRight: 4,
            borderRight: '1px solid var(--border-subtle)',
          }}>
            PRISM
          </a>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {TABS.map(tab => {
              const active = tab.href === '/app' ? path === '/app' : path.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '0 14px', position: 'relative',
                    fontSize: 13, fontWeight: 500,
                    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    textDecoration: 'none',
                    transition: 'color 100ms',
                    borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                    marginBottom: active ? 0 : 0,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right: network + wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--positive)', animation: 'live-pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
              UNICHAIN SEPOLIA
            </span>
          </div>
          <ConnectButton chainStatus="none" showBalance={false} />
        </div>
      </div>
    </nav>
  )
}
