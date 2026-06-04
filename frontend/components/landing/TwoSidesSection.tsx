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

        {/* Section lead — not a slogan, a structural observation */}
        <div style={{ maxWidth: 600, marginBottom: 72 }}>
          <p style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
            marginBottom: 20,
          }}>
            Token structure
          </p>
          <p style={{
            fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 500,
            lineHeight: 1.2, letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
          }}>
            Two rational actors.<br />
            Different appetites.<br />
            <span style={{ color: 'var(--text-tertiary)' }}>The same pool.</span>
          </p>
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
              Whoever holds LP-Y at the time of exit receives the IL compensation.
              Not whoever deposited. Whoever holds.
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
              Collateral is only drawn on LP exit with adverse price movement.
              If price holds or reverts, the LP-D holder keeps collateral and keeps earning.
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
            When the same address holds LP-Y and LP-D, the IL settlement is internal.
            Net effect is a standard Uniswap position. The split is still on-chain,
            which lets protocols partition risk accounting without any external counterparty.
          </p>
        </div>

      </div>
    </section>
  )
}
