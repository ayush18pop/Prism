'use client'

import { useInView } from '@/hooks/useInView'

export function TwoSidesSection() {
  const { ref, inView } = useInView()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: 'var(--bg-surface)',
        padding: '120px 40px',
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(16px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Section lead */}
        <div style={{ maxWidth: 600, marginBottom: 56 }}>
          <div className="spectrum-bar" style={{ marginBottom: 20, maxWidth: 80 }} />
          <p style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            marginBottom: 20,
          }}>
            Token structure
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 400,
            lineHeight: 1.15, letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            One position, unbundled.<br />
            LP-Y takes the yield.<br />
            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>LP-D takes the delta.</span>
          </h2>
        </div>

        {/* Market participants */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 2,
        }}>
          <div style={{
            padding: '20px 28px',
            background: 'var(--lpy-muted)',
            border: '1px solid var(--lpy-border)',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 9, color: 'var(--lpy-base)', letterSpacing: '0.14em', marginBottom: 10,
            }}>
              WHO HOLDS LP-Y
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['LPs wanting predictable fee income', 'Stablecoin treasuries', 'DAOs', 'Yield-focused funds', 'Anyone long volume, short volatility'].map(p => (
                <span key={p} style={{
                  fontSize: 11, color: 'var(--lpy-base)',
                  border: '1px solid var(--lpy-border)',
                  padding: '3px 8px',
                }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div style={{
            padding: '20px 28px',
            background: 'var(--lpd-muted)',
            border: '1px solid var(--lpd-border)',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 9, color: 'var(--lpd-base)', letterSpacing: '0.14em', marginBottom: 10,
            }}>
              WHO HOLDS LP-D
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Protocols bootstrapping liquidity', 'Volatility traders', 'Market makers long their token', 'Yield strategies with leveraged fee exposure'].map(p => (
                <span key={p} style={{
                  fontSize: 11, color: 'var(--lpd-base)',
                  border: '1px solid var(--lpd-border)',
                  padding: '3px 8px',
                }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Token definitions — structured like contract state, not a features table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 2 }}>

          {/* LP-Y */}
          <div style={{
            padding: '32px 36px',
            background: 'var(--bg-raised)',
            borderTop: `3px solid var(--lpy-base)`,
            border: '1px solid var(--border-default)',
            borderTopColor: 'var(--lpy-base)',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 13, fontWeight: 500, color: 'var(--lpy-base)',
              letterSpacing: '0.06em', marginBottom: 24,
            }}>
              LP-Y
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              {[
                { k: 'type', v: 'ERC-1155, tokenId = positionId' },
                { k: 'yield', v: 'swap fees × (1 − feeShareBpsLPD)' },
                { k: 'delta', v: '0' },
                { k: 'IL on exit', v: '0, drawn from LP-D vault' },
                { k: 'transferable', v: 'yes, IL rights follow the token' },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: 'flex', gap: 16 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, width: 100,
                  }}>
                    {k}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              IL compensation follows the token, not the depositor.
              Transfer LP-Y and the protection goes with it. The contract
              checks your balance at claim time, not when you first deposited.
            </p>
          </div>

          {/* LP-D */}
          <div style={{
            padding: '32px 36px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-default)',
            borderTopColor: 'var(--lpd-base)',
            borderTopWidth: 3,
          }}>
            <p style={{
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 13, fontWeight: 500, color: 'var(--lpd-base)',
              letterSpacing: '0.06em', marginBottom: 24,
            }}>
              LP-D
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              {[
                { k: 'type', v: 'ERC-1155, tokenId = positionId' },
                { k: 'yield', v: 'swap fees × feeShareBpsLPD' },
                { k: 'delta', v: 'absorbs IL on LP exit' },
                { k: 'collateral', v: 'USDC, proportional to maxIL' },
                { k: 'transferable', v: 'yes, liability follows the token' },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: 'flex', gap: 16 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                    fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, width: 100,
                  }}>
                    {k}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              Collateral only gets drawn when the LP exits underwater.
              If price holds or comes back, the LP-D holder keeps all of it.
              Plus whatever fee share they picked up along the way.
            </p>
          </div>
        </div>

        {/* Self-insurance case — one compact note, not a section */}
        <div style={{
          padding: '20px 28px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <p style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0,
            letterSpacing: '0.1em',
          }}>
            CASE: LP holds both
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            If you hold both tokens yourself, the IL settles internally. You end up
            in the same place as a regular Uniswap LP. The split still happens on-chain
            though, so the accounting stays clean if you need it.
          </p>
        </div>

      </div>
    </section>
  )
}
