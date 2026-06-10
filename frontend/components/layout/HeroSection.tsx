'use client'

import Link from 'next/link'
import { useRef, useCallback } from 'react'
import { PrismSplitAnimation } from '@/components/landing/PrismSplitAnimation'
import { LiveTicker } from '@/components/landing/LiveTicker'

const NAV_LINKS: [string, string][] = [
  ['#mechanism', 'How It Works'],
  ['#market', 'Market'],
  ['/docs', 'Docs'],
]

const STATS = [
  { value: 'oracle-free',  label: 'IL computation via funded-LP formula' },
  { value: 'one tx',       label: 'deposit, split, bid match, lock' },
  { value: '0 to 100%',    label: 'IL coverage spectrum' },
]

const PITCH_ROWS = [
  { k: 'settlement', v: 'atomic inside afterAddLiquidity — one block, no keeper' },
  { k: 'pricing',    v: 'set by protocol competition, not by the protocol team' },
  { k: 'coverage',   v: 'ilCoverageBps: 0% to 100%, chosen at deposit time' },
]

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)

  // The visitor's cursor is the light source entering the prism
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = sectionRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`)
  }, [])

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      style={{ background: 'var(--bg-base)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}
    >

      {/* Dot grid */}
      <div className="hero-dot-grid" style={{ opacity: 0.35 }} />

      {/* Refraction atmosphere — drifting spectral glows + grain + cursor light */}
      <div className="aurora-amber" />
      <div className="aurora-violet" />
      <div className="aurora-teal" />
      <div className="grain-overlay" />
      <div className="hero-spotlight" />

      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', justifyContent: 'center',
        padding: '12px 24px',
      }}>
        <div style={{
          width: '100%', maxWidth: 760,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 44,
          background: 'rgba(6,6,8,0.92)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid var(--border-default)',
          padding: '0 8px 0 18px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>

          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <polygon points="8,1.5 14.5,13.5 1.5,13.5" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" strokeLinejoin="round" />
              <line x1="1.5" y1="13.5" x2="0" y2="16" stroke="var(--lpy-base)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="8"   y1="13.5" x2="8"   y2="16" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14.5" y1="13.5" x2="16" y2="16" stroke="var(--lpd-base)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.15em',
              color: 'var(--text-primary)',
            }}>PRISM</span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} style={{
                padding: '6px 14px',
                fontSize: 12, color: 'var(--text-tertiary)',
                textDecoration: 'none',
                transition: 'color 150ms, background 150ms',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-secondary)'; el.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-tertiary)'; el.style.background = 'transparent' }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Launch CTA */}
          <Link href="/app" style={{
            padding: '7px 18px',
            background: 'var(--text-primary)', color: 'var(--bg-base)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            textDecoration: 'none',
            transition: 'background 150ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-secondary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-primary)' }}
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* ── Hero content — centered ───────────────────────── */}
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '72px 40px 48px',
        textAlign: 'center',
        position: 'relative',
      }}>

        {/* Sponsor badges */}
        <div className="hero-rise-0" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 48 }}>
          {([
            ['https://docs.uniswap.org/contracts/v4/overview', 'Uniswap v4 Hook'],
            ['https://docs.unichain.org', 'Unichain Sepolia'],
            ['https://reactive.network', 'Reactive Network'],
          ] as [string, string][]).map(([href, label]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', padding: '4px 12px',
              border: '1px solid var(--border-default)',
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)', textDecoration: 'none',
              transition: 'border-color 150ms, color 150ms',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-strong)'; el.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-default)'; el.style.color = 'var(--text-tertiary)' }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Kicker — the mechanism in one line */}
        <p className="hero-rise-1" style={{
          fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
          fontSize: 11, letterSpacing: '0.28em',
          color: 'var(--text-tertiary)',
          marginBottom: 28,
        }}>
          ONE POSITION <span style={{ color: 'var(--text-secondary)' }}>→</span>{' '}
          <span style={{ color: 'var(--lpy-base)' }}>YIELD</span>
          <span style={{ color: 'var(--text-secondary)' }}> + </span>
          <span style={{ color: 'var(--lpd-base)' }}>RISK</span>
        </p>

        {/* Main headline — Instrument Serif with the spectrum refracted into one word */}
        <h1 className="hero-rise-2" style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 'clamp(52px, 7.5vw, 96px)',
          fontWeight: 400,
          lineHeight: 1.02,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          marginBottom: 26,
        }}>
          The IL <em className="text-spectral" style={{ fontStyle: 'italic', paddingRight: '0.04em' }}>options</em> market.
        </h1>

        {/* Sub-headline */}
        <p className="hero-rise-3" style={{
          fontSize: 'clamp(15px, 1.8vw, 20px)',
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          maxWidth: 560,
          margin: '0 auto 44px',
        }}>
          LPs sell impermanent loss risk at a price they choose.
          Protocols compete to buy it.
          The hook clears the market in one block.
        </p>

        {/* CTAs */}
        <div className="hero-rise-3" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 64 }}>
          <Link href="/app" style={{
            display: 'inline-block', padding: '11px 28px',
            background: 'var(--text-primary)', color: 'var(--bg-base)',
            fontSize: 13, fontWeight: 500, letterSpacing: '0.04em',
            textDecoration: 'none', transition: 'background 150ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-secondary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-primary)' }}
          >
            Launch App →
          </Link>
          <a href="#mechanism" style={{
            display: 'inline-block', padding: '11px 28px',
            border: '1px solid var(--border-default)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: 13, fontWeight: 400, letterSpacing: '0.03em',
            textDecoration: 'none', transition: 'border-color 150ms, color 150ms',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-strong)'; el.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-default)'; el.style.color = 'var(--text-secondary)' }}
          >
            How it works
          </a>
        </div>

        {/* Live chain data — the protocol is real, right now */}
        <div className="hero-rise-4" style={{ marginBottom: 64 }}>
          <LiveTicker />
        </div>
      </div>

      {/* ── Prism split animation — full container width ──── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px 64px', position: 'relative' }}>
        <PrismSplitAnimation />
      </div>

      {/* ── Stats strip — below the animation ───────────────── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 40px 80px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          border: '1px solid var(--border-default)',
        }}>
          {STATS.map(({ value, label }, i) => (
            <div key={value} style={{
              padding: '20px 24px', textAlign: 'center',
              borderRight: i < STATS.length - 1 ? '1px solid var(--border-default)' : undefined,
            }}>
              <p style={{
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                letterSpacing: '0.04em', marginBottom: 6,
              }}>
                {value}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pitch row — below the fold ───────────────────── */}
      <div id="pitch" style={{
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          padding: '56px 40px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64,
          alignItems: 'start',
        }}>
          {/* Left */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)',
              marginBottom: 20,
            }}>
              A new financial primitive
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display, serif)',
              fontSize: 'clamp(24px, 2.8vw, 38px)',
              fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.02em',
              color: 'var(--text-primary)', marginBottom: 20,
            }}>
              IL has always been the hidden cost of LP.
              Prism makes it a traded asset.
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
              Every existing IL solution patches around the problem.
              Token emissions, rebalancing vaults, IL insurance — none of them create a market.
              Prism does: LPs price the risk, protocols bid on it, the hook settles it atomically.
              This is only possible on Uniswap v4.
            </p>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PITCH_ROWS.map(({ k, v }, i) => (
              <div key={k} style={{
                display: 'flex', gap: 20, padding: '18px 0',
                borderTop: i === 0 ? '1px solid var(--border-subtle)' : undefined,
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 10, color: 'var(--vault-base)', flexShrink: 0, width: 80,
                  letterSpacing: '0.06em', paddingTop: 2,
                }}>
                  {k}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  )
}
