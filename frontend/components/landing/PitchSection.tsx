'use client'

import { useInView } from '@/hooks/useInView'

export function PitchSection() {
  const { ref, inView } = useInView()

  return (
    <section
      id="pitch"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        background: 'var(--bg-surface)',
        padding: '120px 40px',
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(16px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Lead — the actual structural problem, not a benefits pitch */}
        <p style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)',
          marginBottom: 40,
        }}>
          The structural problem
        </p>

        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500,
          lineHeight: 1.15, letterSpacing: '-0.03em',
          color: 'var(--text-primary)', marginBottom: 32,
        }}>
          AMMs price liquidity correctly.<br />
          <span style={{ color: 'var(--text-tertiary)' }}>They just don&apos;t pay for it correctly.</span>
        </h2>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 20,
          borderLeft: '2px solid var(--border-subtle)', paddingLeft: 28,
          marginBottom: 56,
        }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            An LP signs up for fee income. What they actually get is fee income
            plus a short position on volatility they never agreed to price.
            Not disclosed. Just a structural consequence of providing liquidity on
            a constant product curve. The more price moves, the more the AMM
            routes against them.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-tertiary)' }}>
            Protocols know this math. The standard fix is token emissions:
            pay LPs enough on top to compensate for what the AMM takes.
            It works until emissions stop.
            Then LPs calculate their real P&L and leave.
            Every major DeFi liquidity crisis follows the same script.
          </p>
        </div>

        {/* The actual insight — one line, no italic crescendo */}
        <p style={{
          fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 500,
          lineHeight: 1.3, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          paddingTop: 32, borderTop: '1px solid var(--border-default)',
        }}>
          Liquidity provision and price exposure were never supposed
          to be the same trade.
        </p>

      </div>
    </section>
  )
}
