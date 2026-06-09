'use client'

import Link from 'next/link'
import { PrismSplitAnimation } from '@/components/landing/PrismSplitAnimation'

export function HeroSection() {
  return (
    <section style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav — floating pill */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', justifyContent: 'center',
        padding: '12px 24px',
      }}>
        <div style={{
          width: '100%', maxWidth: 720,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44,
          background: 'rgba(8,8,8,0.92)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 100,
          padding: '0 8px 0 18px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>

          {/* Prism mark + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <polygon points="8,1.5 14.5,13.5 1.5,13.5" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" strokeLinejoin="round" />
              <line x1="1.5" y1="13.5" x2="0" y2="16" stroke="#F0B429" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="8" y1="13.5" x2="8" y2="16" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14.5" y1="13.5" x2="16" y2="16" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.12em',
              color: 'var(--text-primary)',
            }}>PRISM</span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {([['#pitch', 'Protocol'], ['#mechanism', 'How It Works'], ['/docs', 'Docs']] as [string, string][]).map(([href, label]) => (
              <a key={href} href={href} style={{
                padding: '6px 14px', borderRadius: 100,
                fontSize: 13, color: 'var(--text-tertiary)',
                textDecoration: 'none',
                transition: 'color 150ms, background 150ms',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-secondary)'
                  el.style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-tertiary)'
                  el.style.background = 'transparent'
                }}
              >{label}</a>
            ))}
          </div>

          {/* Launch App CTA */}
          <Link href="/app" style={{
            padding: '7px 18px', borderRadius: 100,
            background: 'var(--text-primary)', color: 'var(--bg-base)',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
            textDecoration: 'none',
            transition: 'background 150ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(242,242,242,0.85)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-primary)' }}
          >
            Launch App
          </Link>

        </div>
      </nav>

      {/* ── Two-column body ───────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>

        {/* LEFT: hero */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px 80px', borderRight: '1px solid var(--border-subtle)' }}>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 48 }}>
            {[
              ['https://docs.uniswap.org/contracts/v4/overview', 'Uniswap v4 Hook'],
              ['https://docs.unichain.org', 'Unichain Sepolia'],
              ['https://reactive.network', 'Reactive Network'],
            ].map(([href, label]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
                border: '1px solid var(--border-default)', fontSize: 10, fontWeight: 500,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', textDecoration: 'none',
                transition: 'border-color 150ms, color 150ms',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-strong)'; el.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-default)'; el.style.color = 'var(--text-tertiary)' }}
              >
                {label}
              </a>
            ))}
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 3.5vw, 52px)', fontWeight: 500,
            lineHeight: 1.05, letterSpacing: '-0.04em',
            color: 'var(--text-primary)', margin: '0 0 12px',
          }}>
            Earn fees on Uniswap v4.
          </h1>
          <p style={{
            fontSize: 'clamp(20px, 2.5vw, 38px)', fontWeight: 500,
            lineHeight: 1.1, letterSpacing: '-0.04em',
            color: 'var(--text-secondary)', margin: '0 0 40px',
          }}>
            Without the impermanent loss.
          </p>

          <PrismSplitAnimation style={{ marginBottom: 40 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/app" style={{
              display: 'inline-block', padding: '11px 26px',
              background: 'var(--text-primary)', color: 'var(--bg-base)',
              fontSize: 13, fontWeight: 500, letterSpacing: '0.04em',
              textDecoration: 'none', transition: 'background 150ms',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-secondary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-primary)' }}
            >
              Launch App →
            </Link>
            <span style={{
              fontSize: 11, color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            }}>
              deployed on Unichain Sepolia
            </span>
          </div>
        </div>

        {/* RIGHT: pitch */}
        <div id="pitch" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px 80px', background: 'var(--bg-surface)' }}>

          <p style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            marginBottom: 32,
          }}>
            The structural problem
          </p>

          <h2 style={{
            fontSize: 'clamp(22px, 2.5vw, 36px)', fontWeight: 500,
            lineHeight: 1.15, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: 28,
          }}>
            LPs sign up for fees.<br />
            <span style={{ color: 'var(--text-tertiary)' }}>They also get a short position on volatility they never priced.</span>
          </h2>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            borderLeft: '2px solid var(--border-subtle)', paddingLeft: 24,
            marginBottom: 40,
          }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              It&apos;s not disclosed anywhere. Just structural. Every trade that moves the
              price extracts value from the LP. The constant product curve routes
              against them by design. The more the market moves, the worse
              the real P&L gets compared to just... holding.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-tertiary)' }}>
              The usual response is token emissions. Overpay LPs until the
              math looks okay on paper. It works while the token price holds up.
              When emissions dry out, LPs run the actual numbers and leave.
              Every big DeFi liquidity crisis goes the same way.
            </p>
          </div>

          <p style={{
            fontSize: 'clamp(16px, 1.8vw, 22px)', fontWeight: 500,
            lineHeight: 1.3, letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            paddingTop: 28, borderTop: '1px solid var(--border-default)',
          }}>
            Fee yield and price exposure are two different trades.
            AMMs bundle them. Prism separates them.
          </p>

        </div>
      </div>
    </section>
  )
}
