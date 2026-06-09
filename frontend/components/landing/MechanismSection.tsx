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
            The LP deposits once.<br />
            <span style={{ color: 'var(--text-tertiary)' }}>
              The hook splits the position, matches the bid, locks collateral. All in the same block.
            </span>
          </h2>
        </div>

        {/* Block execution trace */}
        <div style={{
          marginBottom: 48,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '28px 32px',
          fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
        }}>
          {/* Header */}
          <div style={{
            fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)',
            marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)',
          }}>
            BLOCK N  ·  afterAddLiquidity(key, params, delta, hookData)
          </div>

          {/* Trace lines */}
          {[
            { n: '01', text: 'posId = keccak256(poolId ‖ lp ‖ ticks ‖ block.number)' },
            { n: '02', text: 'mint LP-Y  →  lp', color: 'var(--lpy-base)' },
            { n: '03', text: 'standingBids[poolId].pricePerUnit ≥ maxIL ?' },
          ].map(({ n, text, color }) => (
            <div key={n} style={{ display: 'flex', gap: 20, marginBottom: 10, fontSize: 12, lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-tertiary)', minWidth: 20 }}>{n}</span>
              <span style={{ color: color ?? 'var(--text-secondary)' }}>{text}</span>
            </div>
          ))}

          {/* Branch */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginTop: 4, marginBottom: 16 }}>
            <div style={{
              padding: '16px 20px',
              borderLeft: '2px solid var(--lpy-base)',
              background: 'var(--lpy-muted)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--lpy-base)', letterSpacing: '0.1em', marginBottom: 10 }}>
                ├─ YES, bid fills
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div>LP-D  →  protocol wallet</div>
                <div style={{ color: 'var(--vault-base)' }}>vault  ←  bid.collateral (USDC)</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
                LP exits with zero IL exposure
              </div>
            </div>
            <div style={{
              padding: '16px 20px',
              borderLeft: '1px solid var(--border-subtle)',
              background: 'var(--bg-raised)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 10 }}>
                └─ NO, no match
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div>LP-D  →  lp (held)</div>
                <div style={{ color: 'var(--text-tertiary)' }}>no vault, no collateral locked</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
                LP self-insures or sells LP-D later
              </div>
            </div>
          </div>

          {/* Final emit */}
          <div style={{ display: 'flex', gap: 20, fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ color: 'var(--text-tertiary)', minWidth: 20 }}>04</span>
            <span style={{ color: 'var(--text-tertiary)' }}>
              emit PositionOpened(posId, sqrtPrice, tickLower, tickUpper, collateral)
            </span>
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
                A protocol puts USDC in once. Every LP that deposits after that gets
                matched automatically. No keepers, no per-deposit approvals,
                no separate settlement step. It fills or it doesn&apos;t, right at deposit time.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { field: 'pricePerUnit', desc: 'IL fraction the protocol commits to cover. Must exceed the position\'s maxIL, otherwise the bid gets skipped quietly.' },
                { field: 'feeShareBpsLPD', desc: 'Basis points of swap fees routed to LP-D holder per trade. LP-Y earns the remainder.' },
                { field: 'maxCollateral', desc: 'Total USDC budget. Allocated proportionally across matched deposits until exhausted.' },
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
