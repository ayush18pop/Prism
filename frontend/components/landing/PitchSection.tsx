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
          LPs sign up for fees.<br />
          <span style={{ color: 'var(--text-tertiary)' }}>They also get a short position on volatility they never priced.</span>
        </h2>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 20,
          borderLeft: '2px solid var(--border-subtle)', paddingLeft: 28,
          marginBottom: 56,
        }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            It&apos;s not disclosed anywhere. Just structural. Every trade that moves the
            price extracts value from the LP. The constant product curve routes
            against them by design. The more the market moves, the worse
            the real P&L gets compared to just... holding.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-tertiary)' }}>
            The usual response is token emissions. Overpay LPs until the
            math looks okay on paper. It works while the token price holds up.
            When emissions dry out, LPs run the actual numbers and leave.
            Every big DeFi liquidity crisis goes the same way.
          </p>
        </div>

        <p style={{
          fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 500,
          lineHeight: 1.3, letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          paddingTop: 32, borderTop: '1px solid var(--border-default)',
        }}>
          Fee yield and price exposure are two different trades.
          AMMs bundle them. Prism separates them.
        </p>

      </div>
    </section>
  )
}
