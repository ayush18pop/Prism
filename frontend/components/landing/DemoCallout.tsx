'use client'

import Link from 'next/link'
import { useInView } from '@/hooks/useInView'

const STEPS = [
  {
    n: '01',
    title: 'LP opens the app',
    detail: 'Sees three live bids for ETH/USDC 0.3%. Sorted by score. Auto-selection highlights the best terms.',
  },
  {
    n: '02',
    title: 'Picks 80% IL coverage at 5% fee share from Protocol B',
    detail: 'Conscious decision. The deposit UI shows exact terms before any transaction is signed.',
  },
  {
    n: '03',
    title: 'Deposits. One transaction.',
    detail: 'LP-Y lands in wallet. LP-D transfers to Protocol B. USDC collateral locks in the vault. Settlement deferred.',
  },
  {
    n: '04',
    title: 'ETH drops 15%. IL accrues.',
    detail: 'The position is now underwater. IL is computed against the entry sqrtPrice using the funded-LP formula.',
  },
  {
    n: '05',
    title: 'LP removes liquidity and claims.',
    detail: 'Hook draws 80% of IL from the vault into lpYCompensation. LP receives $340 USDC. Principal intact.',
  },
]

export function DemoCallout() {
  const { ref, inView } = useInView()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: 'var(--bg-base)',
        padding: '120px 40px',
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(16px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle violet ambient */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          width: 600, height: 600, borderRadius: '50%',
          background: 'rgba(124,58,237,0.06)',
          filter: 'blur(120px)',
        }} />
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>

          {/* Left: step-by-step walkthrough */}
          <div>
            <div className="spectrum-bar" style={{ marginBottom: 16, maxWidth: 64 }} />
            <p style={{
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-tertiary)',
              marginBottom: 28,
            }}>
              THE DEMO THAT WINS THE ROOM
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {STEPS.map(({ n, title, detail }, i) => (
                <div key={n} style={{ display: 'flex', gap: 20, paddingBottom: i < STEPS.length - 1 ? 28 : 0 }}>
                  {/* Step number + connector */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, flexShrink: 0,
                      border: '1px solid var(--border-default)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                      fontSize: 9, color: 'var(--text-tertiary)',
                      background: 'var(--bg-surface)',
                    }}>
                      {n}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        flex: 1, width: 1,
                        background: 'var(--border-subtle)',
                        marginTop: 4,
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ paddingTop: 4, paddingBottom: i < STEPS.length - 1 ? 0 : 0 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                      letterSpacing: '-0.01em', lineHeight: 1.4, marginBottom: 6,
                    }}>
                      {title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: outcome + punchline */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* Position card mockup */}
            <div style={{
              padding: '24px 28px',
              border: '1px solid var(--border-default)',
              borderTopColor: 'var(--lpy-base)', borderTopWidth: 2,
              background: 'var(--bg-surface)',
              marginBottom: 32,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: 20, paddingBottom: 14,
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.1em',
                }}>
                  POSITION  ·  ETH/USDC  ·  SETTLED
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 9,
                  color: 'var(--positive)',
                  border: '1px solid rgba(22,163,74,0.3)',
                  padding: '2px 8px',
                  letterSpacing: '0.1em',
                }}>
                  80% PROTECTED
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {[
                  { k: 'IL accrued',      v: '$425 USDC', col: 'var(--negative)' },
                  { k: 'coverage',        v: '80%',       col: 'var(--lpy-base)' },
                  { k: 'received',        v: '$340 USDC', col: 'var(--positive)' },
                  { k: 'LP bore',         v: '$85 USDC',  col: 'var(--text-secondary)' },
                  { k: 'fees earned',     v: '$61 USDC',  col: 'var(--text-secondary)' },
                ].map(({ k, v, col }) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                      fontSize: 11, color: 'var(--text-tertiary)',
                    }}>
                      {k}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                      fontSize: 12, color: col, fontWeight: 500,
                    }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '12px 16px',
                background: 'var(--lpy-muted)',
                border: '1px solid var(--lpy-border)',
              }}>
                <p style={{
                  fontSize: 12, color: 'var(--lpy-base)', lineHeight: 1.5,
                }}>
                  Protocol B absorbed the $340. In exchange for $17 in swap fees.
                  That was their trade. They priced it. They took it.
                </p>
              </div>
            </div>

            <p style={{
              fontFamily: 'var(--font-display, serif)',
              fontSize: 'clamp(18px, 2vw, 26px)', fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.4, letterSpacing: '-0.01em',
              fontStyle: 'italic', marginBottom: 24,
            }}>
              No oracle told them what it was worth.
              Protocol B placed a bid. The hook matched it.
              The market did the rest.
            </p>

            <Link href="/app" style={{
              display: 'inline-block', padding: '11px 26px',
              background: 'var(--text-primary)', color: 'var(--bg-base)',
              fontSize: 13, fontWeight: 500, letterSpacing: '0.04em',
              textDecoration: 'none', transition: 'background 150ms',
              alignSelf: 'flex-start',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-secondary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--text-primary)' }}
            >
              Try the demo on Unichain Sepolia →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
