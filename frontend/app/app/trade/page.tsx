'use client'

import { SwapForm } from '@/components/pool/SwapForm'

export default function TradePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 48 }}>
      {/* Header — typographic composition */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        {/* Context label — very quiet, wide tracking */}
        <p style={{
          fontSize: 10, fontWeight: 500, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)',
          marginBottom: 20,
        }}>
          Trader
        </p>

        {/* Headline — commanding size, tight tracking */}
        <h1 style={{
          fontSize: 72, fontWeight: 500, lineHeight: 1,
          letterSpacing: '-0.045em', color: 'var(--text-primary)',
          margin: '0 0 20px',
        }}>
          Swap
        </h1>

        {/* Token pair — colored by design system, mono precision */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 10, marginBottom: 8,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 14, fontWeight: 500, letterSpacing: '0.06em',
            color: 'var(--vault-base)',
          }}>
            USDC
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>→</span>
          <span style={{
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
            fontSize: 14, fontWeight: 500, letterSpacing: '0.06em',
            color: 'var(--lpy-base)',
          }}>
            PRISM
          </span>
        </div>

        {/* Supporting detail — smallest, quietest */}
        <p style={{
          fontSize: 11, color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
        }}>
          at market price · Unichain Sepolia
        </p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 24 }}>
        <SwapForm />
      </div>
    </div>
  )
}
