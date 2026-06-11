'use client'

import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FAUCET_TOKEN_ABI } from '@/lib/abis'

const BLOCKSCOUT = 'https://unichain-sepolia.blockscout.com/tx/'

interface FaucetCardProps {
  symbol: string
  token: `0x${string}` | undefined
  decimals: number
  defaultAmount: string
  /** colour accent — matches the token's role in the protocol */
  accent: string
  blurb: string
  /**
   * When set, this token is not mintable in-app (e.g. real Circle USDC).
   * The card shows balance + a link to the external faucet instead of a mint flow.
   */
  externalFaucet?: { url: string; label: string; note: string }
}

export function FaucetCard({ symbol, token, decimals, defaultAmount, accent, blurb, externalFaucet }: FaucetCardProps) {
  const { address, isConnected } = useAccount()
  const client = usePublicClient({ chainId: 1301 })
  const queryClient = useQueryClient()
  const { writeContractAsync: write } = useWriteContract()

  const [amount, setAmount] = useState(defaultAmount)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const balanceQuery = useReadContract({
    address: token,
    abi: FAUCET_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 1301,
    query: { enabled: !!address && !!token },
  })

  async function mint() {
    if (!token || !address) return
    if (!client) { setError('No RPC client, check chain connection'); return }
    const amt = parseFloat(amount)
    if (!(amt > 0)) { setError('Enter an amount greater than 0'); return }
    setError('')
    setBusy(true)
    try {
      const raw = parseUnits(amount, decimals)
      const tx = await write({
        address: token,
        abi: FAUCET_TOKEN_ABI,
        functionName: 'mint',
        args: [address, raw],
        chainId: 1301,
      })
      const receipt = await client.waitForTransactionReceipt({ hash: tx })
      if (receipt.status === 'reverted') throw new Error('mint reverted on-chain')
      queryClient.invalidateQueries({ queryKey: balanceQuery.queryKey })
      toast.success(`Minted ${Number(amount).toLocaleString()} ${symbol}`, {
        description: 'Test tokens sent to your wallet',
        action: { label: 'View ↗', onClick: () => window.open(BLOCKSCOUT + tx, '_blank') },
      })
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      setError(msg)
      toast.error(`Failed to mint ${symbol}`, { description: msg.slice(0, 120) })
    } finally {
      setBusy(false)
    }
  }

  const balance = balanceQuery.data != null
    ? parseFloat(formatUnits(balanceQuery.data as bigint, decimals))
    : null

  if (!token) {
    return (
      <div style={{ padding: '12px 16px', background: 'var(--warning-muted)', border: '1px solid rgba(217,119,6,0.3)' }}>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--warning)', marginBottom: 4 }}>
          {symbol} not deployed
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Fill <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>lib/addresses.ts</span> after deployment.
        </p>
      </div>
    )
  }

  const header = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            {symbol}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{blurb}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>Balance</div>
        <div style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 14, color: 'var(--text-primary)' }}>
          {balance == null ? '--' : balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  )

  // Real token (e.g. Circle USDC) — no in-app mint, link out to the official faucet.
  if (externalFaucet) {
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {header}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{externalFaucet.note}</p>
        <a
          href={externalFaucet.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '100%', padding: '12px', textAlign: 'center', textDecoration: 'none',
            background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
            color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
            transition: 'background 150ms, border-color 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-overlay)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)' }}
        >
          {externalFaucet.label} ↗
        </a>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {header}

      {/* Amount input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Amount to mint
        </label>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', padding: '10px 12px' }}>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 16, color: 'var(--text-primary)' }}
          />
          <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{symbol}</span>
        </div>
        {/* Quick presets */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['1000', '10000', '100000'].map(p => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              style={{
                flex: 1, padding: '5px 0', cursor: 'pointer',
                background: amount === p ? 'var(--bg-overlay)' : 'transparent',
                border: `1px solid ${amount === p ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                color: amount === p ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 11,
                transition: 'color 120ms, border-color 120ms, background 120ms',
              }}
            >
              {Number(p).toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 11, color: 'var(--negative)', padding: '8px 12px', background: 'var(--negative-muted)', border: '1px solid rgba(220,38,38,0.2)' }}>
          {error}
        </p>
      )}

      {/* Action */}
      <button
        onClick={mint}
        disabled={busy || !isConnected}
        style={{
          width: '100%', padding: '12px',
          background: !busy && isConnected ? 'var(--text-primary)' : 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          color: !busy && isConnected ? 'var(--bg-base)' : 'var(--text-tertiary)',
          fontSize: 13, fontWeight: 500,
          cursor: busy || !isConnected ? 'not-allowed' : 'pointer',
          transition: 'background 150ms, color 150ms',
        }}
      >
        {busy ? `Minting ${symbol}…` : !isConnected ? 'Connect wallet to mint' : `Mint ${Number(amount || 0).toLocaleString()} ${symbol}`}
      </button>
    </div>
  )
}
