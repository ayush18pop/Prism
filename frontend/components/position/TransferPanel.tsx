'use client'

import { useState } from 'react'
import { isAddress } from 'viem'
import { useWriteContract, usePublicClient } from 'wagmi'
import { toast } from 'sonner'
import { ADDRESSES } from '@/lib/addresses'
import { ERC1155_ABI } from '@/lib/abis'
import { TokenPill } from '@/components/ui/index'

const BLOCKSCOUT = 'https://unichain-sepolia.blockscout.com/tx/'
const ZERO_BYTES = '0x' as const

interface TransferPanelProps {
  posId: `0x${string}`
  account: `0x${string}`
  lpYBal: bigint
  lpDBal: bigint
}

export function TransferPanel({ posId, account, lpYBal, lpDBal }: TransferPanelProps) {
  const client = usePublicClient({ chainId: 1301 })
  const { writeContractAsync: write } = useWriteContract()

  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<'LP-Y' | 'LP-D'>('LP-Y')
  const [recipient, setRecipient] = useState('')
  const [loading, setLoading] = useState(false)

  const tokenId   = BigInt(`0x${posId.slice(2)}`)
  const bal       = token === 'LP-Y' ? lpYBal : lpDBal
  const tokenAddr = token === 'LP-Y' ? ADDRESSES.LPYToken : ADDRESSES.LPDToken

  if (lpYBal === 0n && lpDBal === 0n) return null

  const recipientValid = isAddress(recipient)
  const canSubmit = recipientValid && bal > 0n && !loading && !!tokenAddr

  async function submit() {
    if (!canSubmit || !tokenAddr) return
    setLoading(true)
    try {
      const tx = await write({
        address: tokenAddr,
        abi: ERC1155_ABI,
        functionName: 'safeTransferFrom',
        args: [account, recipient as `0x${string}`, tokenId, bal, ZERO_BYTES],
        chainId: 1301,
      })
      if (!client) throw new Error('No RPC client, check chain connection')
      const receipt = await client.waitForTransactionReceipt({ hash: tx })
      if (receipt.status === 'reverted') throw new Error('Transfer reverted on-chain')
      toast.success(`${token} transferred`, {
        description: `→ ${recipient.slice(0, 6)}…${recipient.slice(-4)}`,
        action: { label: 'View ↗', onClick: () => window.open(BLOCKSCOUT + tx, '_blank') },
      })
      setRecipient('')
      setOpen(false)
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      toast.error('Transfer failed', { description: msg.slice(0, 120) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 8 }}>
      {/* Toggle */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)', transition: 'color 150ms',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
      >
        <span style={{ display: 'inline-block', transition: 'transform 200ms', transform: open ? 'rotate(90deg)' : 'none', fontSize: 14 }}>›</span>
        Transfer LP tokens
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>

          {/* Token selector */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['LP-Y', 'LP-D'] as const).map(t => {
              const tBal = t === 'LP-Y' ? lpYBal : lpDBal
              const active = token === t
              const accentColor  = t === 'LP-Y' ? 'var(--lpy-base)'   : 'var(--lpd-base)'
              const accentBg     = t === 'LP-Y' ? 'var(--lpy-muted)'  : 'var(--lpd-muted)'
              const accentBorder = t === 'LP-Y' ? 'var(--lpy-border)' : 'var(--lpd-border)'
              const hasIt = tBal > 0n
              return (
                <button
                  key={t}
                  disabled={!hasIt}
                  onClick={() => setToken(t)}
                  style={{
                    flex: 1, padding: '10px 12px', textAlign: 'left',
                    cursor: hasIt ? 'pointer' : 'not-allowed', opacity: hasIt ? 1 : 0.35,
                    background: active ? accentBg : 'var(--bg-raised)',
                    border: `1px solid ${active ? accentBorder : 'var(--border-subtle)'}`,
                    transition: 'background 150ms, border-color 150ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TokenPill variant={t === 'LP-Y' ? 'lpy' : 'lpd'} />
                    {!hasIt && (
                      <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                        not held
                      </span>
                    )}
                  </div>
                  {active && (
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>
                      {t === 'LP-Y'
                        ? 'Transferring LP-Y passes IL compensation rights to the recipient.'
                        : 'Transferring LP-D passes fee share and settlement rights.'}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Recipient */}
          <div>
            <label style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)', display: 'block', marginBottom: 6,
            }}>
              RECIPIENT ADDRESS
            </label>
            <input
              type="text" placeholder="0x..."
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'var(--bg-raised)',
                border: `1px solid ${recipient && !recipientValid ? 'rgba(220,38,38,0.4)' : 'var(--border-default)'}`,
                color: 'var(--text-primary)', fontSize: 13,
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', outline: 'none',
              }}
            />
            {recipient && !recipientValid && (
              <span style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4, display: 'block' }}>
                Invalid address
              </span>
            )}
          </div>

          {/* Submit — transfers full balance */}
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '10px',
              background: canSubmit
                ? (token === 'LP-Y' ? 'var(--lpy-base)' : 'var(--lpd-base)')
                : 'var(--bg-raised)',
              border: '1px solid var(--border-default)',
              color: canSubmit ? '#080808' : 'var(--text-tertiary)',
              fontSize: 13, fontWeight: 500,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'background 150ms, color 150ms',
            }}
          >
            {loading ? 'Transferring…' : `Transfer all ${token}`}
          </button>
        </div>
      )}
    </div>
  )
}
