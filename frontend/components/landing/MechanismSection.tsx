'use client'

import { useInView } from '@/hooks/useInView'

export function MechanismSection() {
  const { ref, inView } = useInView()

  return (
    <section
      id="mechanism"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: 'var(--bg-base)',
        padding: '120px 40px',
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(16px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* The hook callback as the visual anchor */}
        <div style={{ marginBottom: 64 }}>
          <p style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 11, letterSpacing: '0.12em',
            color: 'var(--text-tertiary)', marginBottom: 20,
          }}>
            function afterAddLiquidity(...)
          </p>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500,
            lineHeight: 1.15, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', maxWidth: 600,
          }}>
            The LP deposits.<br />
            <span style={{ color: 'var(--text-tertiary)' }}>
              The hook handles everything else.
            </span>
          </h2>
        </div>

        {/* Transaction view — not steps */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
          marginBottom: 48,
        }}>
          {/* Before */}
          <div style={{
            padding: '28px 32px',
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          }}>
            <p style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)',
              marginBottom: 20,
            }}>
              What the LP sends
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'poolKey (USDC/PRISM, fee, tickSpacing, hook)',
                'tickLower, tickUpper',
                'liquidityDelta',
              ].map(line => (
                <p key={line} style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                  {line}
                </p>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 16, lineHeight: 1.6 }}>
              Identical to any standard v4 deposit. No extra steps.
            </p>
          </div>

          {/* After */}
          <div style={{
            padding: '28px 32px',
            background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          }}>
            <p style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--text-tertiary)',
              marginBottom: 20,
            }}>
              What ends up in the LP wallet
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'LP-Y token', color: 'var(--lpy-base)', note: 'fee yield, zero delta' },
                { label: 'LP-D token*', color: 'var(--lpd-base)', note: 'if no standing bid matched' },
              ].map(({ label, color, note }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <p style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 12, color, lineHeight: 1.6, flexShrink: 0,
                  }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{note}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 16, lineHeight: 1.6 }}>
              * If a standing bid matched, LP-D was already sold in the same transaction.
              LP-Y only. IL: $0.
            </p>
          </div>
        </div>

        {/* Standing bid — described as a market mechanism, not a feature */}
        <div style={{
          padding: '32px 36px',
          border: '1px solid var(--border-default)',
          borderLeft: '3px solid var(--vault-base)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                fontSize: 11, color: 'var(--vault-base)', letterSpacing: '0.1em',
                marginBottom: 12,
              }}>
                standingBids[poolId]
              </p>
              <p style={{
                fontSize: 18, fontWeight: 500, color: 'var(--text-primary)',
                letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 12,
              }}>
                The protocol pre-funds once.<br />
                Every deposit fills atomically.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                No per-deposit transactions. No keeper bots. No manual settlement.
                The bid fills or doesn&apos;t, at deposit time, in the same block.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { field: 'pricePerUnit', desc: 'IL coverage fraction (0.0 to 1.0). Must cover maxIL to fill.' },
                { field: 'feeShareBpsLPD', desc: 'Ongoing fee share earned by LP-D holder per swap.' },
                { field: 'maxCollateral', desc: 'Total USDC pre-deposited. Used proportionally across fills.' },
              ].map(({ field, desc }) => (
                <div key={field}>
                  <p style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4,
                  }}>
                    {field}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
