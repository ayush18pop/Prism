'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

type Phase = 'pre' | 'split' | 'sold'

export function HeroSection() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('pre')
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  // Auto-sequence: bar splits 800ms after mount
  useEffect(() => {
    const t = setTimeout(() => setPhase('split'), 800)
    return () => clearTimeout(t)
  }, [])

  // Mouse moves across bar → adjusts split ratio in real-time
  const onBarMouseMove = useCallback((e: React.MouseEvent) => {
    if (phase === 'pre') return
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setMouseX(Math.round(Math.max(15, Math.min(85, pct))))
    setHasInteracted(true)
  }, [phase])

  const onBarMouseLeave = useCallback(() => setMouseX(null), [])

  // Click: sell LP-D (phase: split → sold), or replay (sold → pre → split)
  const onBarClick = useCallback(() => {
    if (phase === 'split') {
      setPhase('sold')
    } else if (phase === 'sold') {
      setPhase('pre')
      setMouseX(null)
      setHasInteracted(false)
      setTimeout(() => setPhase('split'), 350)
    }
  }, [phase])

  const lpyPct = mouseX ?? 70
  const lpdPct = 100 - lpyPct
  const feeSharePct = Math.round(lpdPct)

  const barHeight = 100
  const vaultHeight = 22

  return (
    <section style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 56,
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-base)',
      }}>
        <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 15, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
          PRISM
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="nav-desktop">
          {[['#pitch', 'Protocol'], ['#mechanism', 'How It Works'], ['/docs', 'Docs']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
            >
              {label}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/app" style={{
            padding: '6px 16px', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--text-primary)', textDecoration: 'none',
            border: '1px solid var(--border-default)', background: 'none', transition: 'border-color 150ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
          >
            Launch App
          </Link>
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
            className="nav-mobile"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              {menuOpen ? (
                <><line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="15" y1="3" x2="3" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>
              ) : (
                <><line x1="3" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', padding: '20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[['#pitch', 'Protocol'], ['#mechanism', 'How It Works'], ['/docs', 'Docs']].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ fontSize: 14, color: 'var(--text-secondary)', textDecoration: 'none' }}>{label}</a>
          ))}
        </div>
      )}

      {/* ── Hero body ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 40px 80px', maxWidth: 960, margin: '0 auto', width: '100%' }}>

        {/* Sponsor tags */}
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

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(36px, 5.5vw, 64px)', fontWeight: 500,
          lineHeight: 1.05, letterSpacing: '-0.04em',
          color: 'var(--text-primary)', margin: '0 0 12px',
          opacity: phase === 'pre' ? 0.4 : 1,
          transition: 'opacity 500ms ease',
        }}>
          Earn the yield.
        </h1>
        <p style={{
          fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500,
          lineHeight: 1.1, letterSpacing: '-0.04em',
          color: 'var(--text-secondary)', margin: '0 0 56px',
          opacity: phase === 'pre' ? 0.2 : 1,
          transition: 'opacity 500ms ease 200ms',
        }}>
          Skip the delta.
        </p>

        {/* ── THE INTERACTIVE SPLIT BAR ───────────────────── */}
        <div style={{ marginBottom: 16 }}>

          {/* Instruction hint */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10,
            opacity: phase === 'pre' ? 0 : 1,
            transition: 'opacity 400ms ease',
          }}>
            <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>
              {phase === 'sold'
                ? 'LP-D sold · LP-Y held · IL = $0'
                : hasInteracted
                  ? `fee share: LP-Y ${lpyPct}% · LP-D ${feeSharePct}%`
                  : 'move cursor to adjust fee share · click to sell LP-D'}
            </span>
            {phase === 'sold' && (
              <button onClick={onBarClick} style={{
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 10,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
                background: 'none', border: '1px solid var(--border-subtle)', padding: '3px 10px',
                cursor: 'pointer', transition: 'border-color 150ms, color 150ms',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-strong)'; el.style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-subtle)'; el.style.color = 'var(--text-tertiary)' }}
              >
                replay ↺
              </button>
            )}
          </div>

          {/* Main bar */}
          <div
            ref={barRef}
            onMouseMove={onBarMouseMove}
            onMouseLeave={onBarMouseLeave}
            onClick={phase !== 'sold' ? onBarClick : undefined}
            style={{
              display: 'flex', width: '100%', height: barHeight,
              cursor: phase === 'pre' ? 'default' : phase === 'split' ? 'pointer' : 'default',
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {/* LP-Y bar */}
            <div style={{
              width: phase === 'pre' ? '100%' : `${lpyPct}%`,
              height: '100%',
              background: phase === 'pre' ? 'var(--border-strong)' : 'var(--lpy-base)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px', overflow: 'hidden',
              transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1), background 500ms ease',
              position: 'relative',
            }}>
              {phase !== 'pre' && (
                <>
                  <span style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 13, fontWeight: 500, color: '#080808', letterSpacing: '0.08em',
                    opacity: lpyPct > 18 ? 1 : 0, transition: 'opacity 200ms',
                  }}>
                    LP-Y
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 28, fontWeight: 400, color: '#080808', letterSpacing: '-0.02em',
                    opacity: lpyPct > 25 ? 1 : 0, transition: 'opacity 200ms',
                  }}>
                    {lpyPct}%
                  </span>
                </>
              )}
              {/* Pulse for pre state */}
              {phase === 'pre' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-tertiary)', animation: 'live-pulse 2s ease-in-out infinite' }}>
                    LP POSITION
                  </span>
                </div>
              )}
            </div>

            {/* LP-D bar */}
            {phase !== 'pre' && (
              <div style={{
                width: `${lpdPct}%`,
                height: '100%',
                background: phase === 'sold' ? 'var(--bg-raised)' : 'var(--lpd-base)',
                border: phase === 'sold' ? '1px solid var(--border-default)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', overflow: 'hidden',
                transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1), background 500ms ease',
              }}>
                {phase === 'sold' ? (
                  <span style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.06em',
                    opacity: lpdPct > 15 ? 1 : 0, transition: 'opacity 200ms',
                    whiteSpace: 'nowrap',
                  }}>
                    LP-D sold to protocol
                  </span>
                ) : (
                  <>
                    <span style={{
                      fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                      fontSize: 13, fontWeight: 500, color: '#F2F2F2', letterSpacing: '0.08em',
                      opacity: lpdPct > 18 ? 1 : 0, transition: 'opacity 200ms',
                    }}>
                      LP-D
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                      fontSize: 28, fontWeight: 400, color: '#F2F2F2', letterSpacing: '-0.02em',
                      opacity: lpdPct > 25 ? 1 : 0, transition: 'opacity 200ms',
                    }}>
                      {feeSharePct}%
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Vault bar */}
          <div style={{
            width: '100%', height: vaultHeight, background: 'var(--vault-base)',
            display: 'flex', alignItems: 'center', paddingLeft: 16,
            marginTop: 4,
            opacity: phase === 'pre' ? 0 : 1,
            transform: phase === 'pre' ? 'translateY(4px)' : 'none',
            transition: 'opacity 400ms ease 400ms, transform 400ms ease 400ms',
          }}>
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#080808' }}>
              VAULT · USDC collateral
            </span>
          </div>

          {/* Bar labels */}
          <div style={{
            display: 'flex', marginTop: 12, gap: 0,
            opacity: phase === 'pre' ? 0 : 1,
            transition: 'opacity 300ms ease 600ms',
          }}>
            <div style={{ width: `${lpyPct}%`, transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden' }}>
              <p style={{ fontSize: 11, color: 'var(--lpy-base)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', whiteSpace: 'nowrap' }}>
                fee yield · zero IL
              </p>
            </div>
            <div style={{ width: `${lpdPct}%`, transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', paddingLeft: 8 }}>
              <p style={{ fontSize: 11, color: phase === 'sold' ? 'var(--text-tertiary)' : 'var(--lpd-base)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', whiteSpace: 'nowrap', transition: 'color 400ms' }}>
                {phase === 'sold' ? '→ protocol wallet' : 'delta + fee share'}
              </p>
            </div>
          </div>

          {/* IL = $0 reveal on sold */}
          <div style={{
            marginTop: 24,
            opacity: phase === 'sold' ? 1 : 0,
            transform: phase === 'sold' ? 'none' : 'translateY(8px)',
            transition: 'opacity 500ms ease 300ms, transform 500ms ease 300ms',
            pointerEvents: 'none',
          }}>
            <p style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 48, fontWeight: 400, color: 'var(--positive)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              IL = $0
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              LP-D absorbed all price exposure. LP-Y holder exits whole.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/app" style={{
            display: 'inline-block', padding: '11px 26px',
            background: 'var(--text-primary)', color: 'var(--bg-base)',
            fontSize: 13, fontWeight: 500, letterSpacing: '0.04em',
            textDecoration: 'none',
            opacity: phase === 'pre' ? 0.3 : 1,
            transition: 'background 150ms, opacity 500ms ease 800ms',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-secondary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-primary)' }}
          >
            Launch App →
          </Link>
          <span style={{
            fontSize: 11, color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            opacity: phase === 'pre' ? 0 : 1, transition: 'opacity 500ms ease 1000ms',
          }}>
            Unichain Sepolia · live contracts
          </span>
        </div>

      </div>
    </section>
  )
}
