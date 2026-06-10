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
          <div className="spectrum-bar" style={{ marginBottom: 20, maxWidth: 80 }} />
          <p style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 11, letterSpacing: '0.12em',
            color: 'var(--text-tertiary)', marginBottom: 20,
          }}>
            afterAddLiquidity  ·  the hook callback that runs at deposit time
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400,
            lineHeight: 1.15, letterSpacing: '-0.02em',
            color: 'var(--text-primary)', maxWidth: 680,
          }}>
            One deposit, one transaction.<br />
            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              The hook scores every active bid, selects the best match, locks collateral, and settles the split. All in the same block.
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
            { n: '03', text: 'for each active bid: score = ilCoverageBps * (10000 - feeShareBpsLPD) / 10000', color: 'var(--text-tertiary)' },
            { n: '04', text: 'best = bid with highest score where collateral covers maxIL' },
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
                ├─ YES, best bid fills
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div>LP-D  →  winning protocol wallet</div>
                <div style={{ color: 'var(--vault-base)' }}>vault  ←  USDC  (bid.ilCoverageBps fraction of maxIL)</div>
                <div style={{ color: 'var(--lpy-base)' }}>pos.ilCoverageBps  =  bid.ilCoverageBps  (frozen)</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
                LP exits with chosen coverage level, zero IL up to that fraction
              </div>
            </div>
            <div style={{
              padding: '16px 20px',
              borderLeft: '1px solid var(--border-subtle)',
              background: 'var(--bg-raised)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 10 }}>
                └─ NO, no adequate bid
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 2 }}>
                <div>LP-D  →  lp (held)</div>
                <div style={{ color: 'var(--text-tertiary)' }}>no vault, no collateral locked</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
                deposit never reverts, LP retains both tokens
              </div>
            </div>
          </div>

          {/* Final emit */}
          <div style={{ display: 'flex', gap: 20, fontSize: 12, lineHeight: 1.6 }}>
            <span style={{ color: 'var(--text-tertiary)', minWidth: 20 }}>05</span>
            <span style={{ color: 'var(--text-tertiary)' }}>
              emit PositionOpened(posId, sqrtPrice, tickLower, tickUpper, collateral)
            </span>
          </div>
        </div>

        {/* Standing bid — described as a market mechanism, not a feature */}
        <div style={{
          padding: '32px 36px',
          border: '1px solid var(--border-default)',
          borderTop: '2px solid var(--vault-base)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div>
              <p style={{
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                fontSize: 11, color: 'var(--vault-base)', letterSpacing: '0.1em',
                marginBottom: 12,
              }}>
                bids[poolId]  ·  the on-chain order book
              </p>
              <p style={{
                fontSize: 18, fontWeight: 500, color: 'var(--text-primary)',
                letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 12,
              }}>
                Protocols post bids.<br />
                The best one fills each deposit.
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Any protocol can post a bid with their coverage terms and USDC collateral.
                Multiple bids compete. Each deposit automatically matches the highest-scoring
                bid that has enough collateral to cover the position&apos;s maxIL.
                No keepers, no per-deposit approvals, no separate settlement step.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { field: 'ilCoverageBps', desc: 'Fraction of IL this bid commits to cover, in basis points. 10000 = 100%. Frozen into the position at fill time.' },
                { field: 'feeShareBpsLPD', desc: 'Basis points of swap fees routed to LP-D holder. LP-Y earns the remainder. Lower demand = higher score.' },
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
