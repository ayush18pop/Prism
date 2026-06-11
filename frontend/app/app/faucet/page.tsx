'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ADDRESSES } from '@/lib/addresses'
import { FaucetCard } from '@/components/faucet/FaucetCard'

export default function FaucetPage() {
  const { isConnected, chainId } = useAccount()
  const isCorrectNetwork = chainId === 1301

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <div className="spectrum-bar" style={{ marginBottom: 16, maxWidth: 64 }} />
        <p className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>TESTNET FAUCET</p>
        <h1 className="text-display" style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Get test tokens</h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)', maxWidth: 560 }}>
          Mint free USDC and PRISM on Unichain Sepolia to try the protocol. Both are mock
          testnet tokens. PRISM and USDC are the pool pair; USDC also serves as LP-D collateral.
        </p>
      </div>

      {/* ── Network / connection gate ────────────────────── */}
      {!isConnected ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '40px', textAlign: 'center' }}>
          <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Connect your wallet to mint test tokens
          </p>
          <ConnectButton />
        </div>
      ) : !isCorrectNetwork ? (
        <div style={{ padding: '16px', background: 'var(--warning-muted)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <p className="text-body" style={{ fontWeight: 500, color: 'var(--warning)', marginBottom: 4 }}>Wrong Network</p>
          <p className="text-small" style={{ color: 'var(--text-secondary)' }}>Switch to Unichain Sepolia (chain 1301) to mint.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <FaucetCard
            symbol="USDC"
            token={ADDRESSES.USDC}
            decimals={6}
            defaultAmount="10000"
            accent="var(--vault-base)"
            blurb="Collateral + pool token · mock · 6 dec"
          />
          <FaucetCard
            symbol="PRISM"
            token={ADDRESSES.PRISM}
            decimals={6}
            defaultAmount="10000"
            accent="var(--lpd-base)"
            blurb="Pool token · 6 dec"
          />
        </div>
      )}

      {/* ── How to use ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { n: '01', title: 'Get ETH for gas', body: 'You need a little Unichain Sepolia ETH to pay gas. Use a public Sepolia bridge or faucet.' },
          { n: '02', title: 'Mint USDC + PRISM', body: 'Mint both tokens above. You need USDC and PRISM to provide liquidity, and USDC to bid on LP-D.' },
          { n: '03', title: 'Try the protocol', body: 'Head to Provide to deposit liquidity, or LP-D to post a coverage bid.' },
        ].map(({ n, title, body }) => (
          <div key={n} style={{ border: '1px solid var(--border-default)', padding: '16px 20px' }}>
            <div className="text-mono-sm" style={{ color: 'var(--text-tertiary)', marginBottom: 10 }}>{n}</div>
            <div className="text-body" style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
            <div className="text-small" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
