'use client'

import { useAccount, useSwitchChain } from 'wagmi'

/** Sticky banner shown on every app page when the wallet is on the wrong chain. */
export function NetworkGuard() {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected || chainId === 1301) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      padding: '8px 16px', background: 'var(--warning-muted)',
      borderBottom: '1px solid rgba(217,119,6,0.3)',
    }}>
      <span className="text-small" style={{ color: 'var(--warning)' }}>
        Wrong network — Prism runs on Unichain Sepolia (chain 1301)
      </span>
      <button
        disabled={isPending}
        onClick={() => switchChain({ chainId: 1301 })}
        style={{
          padding: '3px 10px', fontSize: 11, fontWeight: 500,
          background: 'var(--warning)', border: 'none', color: '#080808',
          cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? 'Switching…' : 'Switch'}
      </button>
    </div>
  )
}
