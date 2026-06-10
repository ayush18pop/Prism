'use client'

import { useInView } from '@/hooks/useInView'

const BIDS = [
  { bidder: '0xABC...def', coverage: 100, feeShare: 15, usdc: '$8,400', score: 8500, selected: true },
  { bidder: '0xDEF...123', coverage: 80, feeShare: 5, usdc: '$2,200', score: 7600, selected: false },
  { bidder: '0x456...789', coverage: 60, feeShare: 0, usdc: '$12,000', score: 6000, selected: false },
]

const SPECTRUM = [
  { bps: 10000, pct: '100%', desc: 'zero IL exposure, give up a slice of fees to LP-D holder', col: 'var(--positive)' },
  { bps: 7000,  pct: ' 70%', desc: '70% of IL covered, keep a larger share of fees',           col: 'var(--lpy-base)' },
  { bps: 5000,  pct: ' 50%', desc: 'half the IL absorbed, minimal fee share surrendered',       col: 'var(--vault-base)' },
  { bps: 0,     pct: '  0%', desc: 'standard AMM LP, full IL, 100% of fees kept',               col: 'var(--text-tertiary)' },
]

export function MarketplaceSection() {
  const { ref, inView } = useInView()

  return (
    <section
      id="market"
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

        {/* Section header */}
        <div style={{ maxWidth: 640, marginBottom: 64 }}>
          <div className="spectrum-bar" style={{ marginBottom: 20, maxWidth: 80 }} />
          <p style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 11, letterSpacing: '0.12em',
            color: 'var(--vault-base)', marginBottom: 20,
          }}>
            ilCoverageBps  ·  0 ... 10000
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 400,
            lineHeight: 1.15, letterSpacing: '-0.02em',
            color: 'var(--text-primary)', marginBottom: 20,
          }}>
            IL is not binary.<br />
            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Every point on the spectrum is a distinct trade.
            </span>
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-tertiary)' }}>
            One parameter unlocks the full range between standard AMM LP and full IL protection.
            LPs set their coverage level. Protocols compete to offer the best terms.
            The hook is the matching engine.
          </p>
        </div>

        {/* Coverage spectrum */}
        <div style={{
          marginBottom: 48,
          padding: '28px 32px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)',
            marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)',
          }}>
            LP-Y  ·  COVERAGE LEVEL  ·  ilCoverageBps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {SPECTRUM.map(({ bps, pct, desc, col }) => (
              <div key={bps} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 12, color: col, minWidth: 40, textAlign: 'right', flexShrink: 0,
                }}>
                  {pct}
                </span>
                <div style={{
                  flex: '0 0 220px', height: 3,
                  background: 'var(--border-subtle)', position: 'relative', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: bps === 0 ? '2px' : `${bps / 100}%`,
                    background: col,
                    transition: inView ? 'width 1000ms ease' : 'none',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Two-sided market flow SVG */}
        <div style={{
          marginBottom: 48,
          padding: '28px 32px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          overflowX: 'auto',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)',
            marginBottom: 24, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)',
          }}>
            MARKET STRUCTURE  ·  ATOMIC  ·  ONE BLOCK
          </div>

          <svg viewBox="0 0 820 130" style={{ width: '100%', maxWidth: 780, display: 'block', margin: '0 auto' }}>
            <defs>
              <marker id="mkt-arrow-white" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="var(--text-tertiary)" />
              </marker>
              <marker id="mkt-arrow-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#F0B429" />
              </marker>
              <marker id="mkt-arrow-violet" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#7C3AED" />
              </marker>
              <marker id="mkt-arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#2775CA" />
              </marker>
              <style>{`
                @keyframes mkt-dash { to { stroke-dashoffset: -24; } }
                .mkt-flow { animation: mkt-dash 1.2s linear infinite; }
                .mkt-flow-slow { animation: mkt-dash 2s linear infinite; }
              `}</style>
            </defs>

            {/* LP node */}
            <rect x="0" y="40" width="130" height="50" fill="#161616" stroke="#242424" strokeWidth="1" />
            <text x="65" y="62" textAnchor="middle" fill="var(--text-primary)" fontSize="11"
                  fontFamily="'JetBrains Mono',monospace" letterSpacing="0.08em">LP</text>
            <text x="65" y="79" textAnchor="middle" fill="#444" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">deposits liquidity</text>

            {/* Hook node */}
            <rect x="310" y="28" width="180" height="74" fill="#161616" stroke="#333" strokeWidth="1.5" />
            <text x="400" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="11"
                  fontFamily="'JetBrains Mono',monospace" letterSpacing="0.08em">PRISM HOOK</text>
            <text x="400" y="74" textAnchor="middle" fill="#444" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">afterAddLiquidity</text>
            <text x="400" y="89" textAnchor="middle" fill="#555" fontSize="7.5"
                  fontFamily="'JetBrains Mono',monospace">scores bids, locks collateral</text>

            {/* Protocol node */}
            <rect x="660" y="40" width="140" height="50" fill="#161616" stroke="#7C3AED" strokeWidth="1"
                  strokeOpacity="0.5" />
            <text x="730" y="62" textAnchor="middle" fill="#7C3AED" fontSize="11"
                  fontFamily="'JetBrains Mono',monospace" letterSpacing="0.08em">PROTOCOL</text>
            <text x="730" y="79" textAnchor="middle" fill="#444" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">standing bid</text>

            {/* LP -> Hook: liquidity (bottom path) */}
            <line x1="130" y1="72" x2="306" y2="72"
                  stroke="#333" strokeWidth="1" strokeDasharray="6 4"
                  markerEnd="url(#mkt-arrow-white)"
                  className="mkt-flow" />
            <text x="218" y="85" textAnchor="middle" fill="#444" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">liquidity</text>

            {/* Hook -> LP: LP-Y (top curved path back) */}
            <path d="M 312 42 Q 220 8 130 42"
                  fill="none" stroke="#F0B429" strokeWidth="1.5" strokeDasharray="7 4"
                  markerEnd="url(#mkt-arrow-amber)"
                  className="mkt-flow" />
            <text x="218" y="15" textAnchor="middle" fill="#F0B429" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">LP-Y  (zero IL)</text>

            {/* Hook -> Protocol: LP-D (bottom path) */}
            <line x1="492" y1="72" x2="656" y2="72"
                  stroke="#7C3AED" strokeWidth="1" strokeDasharray="6 4"
                  markerEnd="url(#mkt-arrow-violet)"
                  className="mkt-flow" />
            <text x="574" y="85" textAnchor="middle" fill="#7C3AED" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">LP-D</text>

            {/* Protocol -> Hook: USDC collateral (top curved path) */}
            <path d="M 660 48 Q 574 8 492 42"
                  fill="none" stroke="#2775CA" strokeWidth="1.5" strokeDasharray="7 4"
                  markerEnd="url(#mkt-arrow-blue)"
                  className="mkt-flow-slow" />
            <text x="574" y="15" textAnchor="middle" fill="#2775CA" fontSize="8.5"
                  fontFamily="'JetBrains Mono',monospace">USDC collateral</text>

            {/* Center label */}
            <text x="400" y="118" textAnchor="middle" fill="#333" fontSize="8"
                  fontFamily="'JetBrains Mono',monospace" letterSpacing="0.1em">
              all of this  ·  one transaction  ·  one block
            </text>
          </svg>
        </div>

        {/* Order book table */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-tertiary)',
            marginBottom: 12,
          }}>
            AVAILABLE BIDS  ·  ETH/USDC 0.3%  ·  SORTED BY SCORE
          </p>
          <div style={{ border: '1px solid var(--border-default)' }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 90px',
              padding: '10px 20px',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--bg-base)',
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
              fontSize: 9, letterSpacing: '0.14em', color: 'var(--text-tertiary)',
            }}>
              <span>BIDDER</span>
              <span>IL COVERAGE</span>
              <span>FEE SHARE</span>
              <span>USDC LEFT</span>
              <span>SCORE</span>
              <span />
            </div>

            {BIDS.map((bid, i) => (
              <div key={bid.bidder} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 90px',
                padding: '14px 20px',
                borderBottom: i < BIDS.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                background: bid.selected ? 'var(--lpy-muted)' : 'transparent',
                alignItems: 'center',
                transition: 'background 200ms',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 11,
                  color: bid.selected ? 'var(--lpy-base)' : 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {bid.bidder}
                  {bid.selected && (
                    <span style={{
                      fontSize: 8, letterSpacing: '0.12em',
                      color: 'var(--lpy-base)',
                      border: '1px solid var(--lpy-border)',
                      padding: '1px 6px',
                    }}>
                      AUTO
                    </span>
                  )}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 13,
                  color: bid.coverage === 100 ? 'var(--positive)'
                       : bid.coverage >= 70  ? 'var(--lpy-base)'
                       :                       'var(--text-secondary)',
                }}>
                  {bid.coverage}%
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 12, color: 'var(--text-secondary)',
                }}>
                  {bid.feeShare}%
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 12, color: 'var(--vault-base)',
                }}>
                  {bid.usdc}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 12,
                  color: bid.selected ? 'var(--lpy-base)' : 'var(--text-secondary)',
                }}>
                  {bid.score.toLocaleString()}
                </span>
                <div style={{
                  padding: '5px 0', textAlign: 'center',
                  border: '1px solid',
                  borderColor: bid.selected ? 'var(--lpy-border)' : 'var(--border-default)',
                  background: bid.selected ? 'rgba(240,180,41,0.08)' : 'transparent',
                  color: bid.selected ? 'var(--lpy-base)' : 'var(--text-tertiary)',
                  fontSize: 10, letterSpacing: '0.06em',
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                }}>
                  {bid.selected ? 'selected' : 'select'}
                </div>
              </div>
            ))}

            {/* No coverage row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 90px',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-default)',
              alignItems: 'center',
              opacity: 0.55,
            }}>
              {(['no coverage', '--', '100%', '--', '--', 'select'] as const).map((v, i) => (
                <span key={i} style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: i === 5 ? 10 : 12,
                  color: 'var(--text-tertiary)',
                  ...(i === 5 ? {
                    padding: '5px 0', textAlign: 'center' as const,
                    border: '1px solid var(--border-subtle)',
                    letterSpacing: '0.06em',
                  } : {}),
                }}>
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap',
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 10, color: 'var(--text-tertiary)',
          }}>
            <span style={{ color: 'var(--lpy-base)' }}>score</span>
            <span style={{ color: 'var(--border-strong)' }}>=</span>
            <span>ilCoverageBps</span>
            <span style={{ color: 'var(--border-strong)' }}>*</span>
            <span>(10000 - feeShareBpsLPD)</span>
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span>10000</span>
            <span style={{ color: 'var(--border-default)', margin: '0 4px' }}>|</span>
            <span>auto-fill picks the highest score</span>
          </div>
        </div>

        {/* Three-column market clearing */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          {[
            {
              mono: 'LP SIDE',
              title: 'Sell IL risk at a price you choose',
              desc: 'Pick the coverage level. Pick the fee split. The hook encodes your choice into the deposit. No second transaction. No manual negotiation.',
              color: 'var(--lpy-base)',
            },
            {
              mono: 'PROTOCOL SIDE',
              title: 'Buy IL exposure at a price you set',
              desc: 'Post a bid with your coverage terms and USDC collateral. Compete for LP order flow. Best score wins the position.',
              color: 'var(--lpd-base)',
            },
            {
              mono: 'THE HOOK',
              title: 'Clears the market in one block',
              desc: 'No oracle, no keeper, no counterparty risk. Settlement runs atomically inside afterAddLiquidity. The block is the settlement layer.',
              color: 'var(--vault-base)',
            },
          ].map(({ mono, title, desc, color }) => (
            <div key={mono} style={{
              padding: '24px 28px',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
              borderTopColor: color, borderTopWidth: 2,
            }}>
              <p style={{
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                fontSize: 9, color, letterSpacing: '0.14em', marginBottom: 10,
              }}>
                {mono}
              </p>
              <p style={{
                fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                letterSpacing: '-0.01em', lineHeight: 1.4, marginBottom: 10,
              }}>
                {title}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.65 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
