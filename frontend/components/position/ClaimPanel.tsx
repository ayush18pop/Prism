'use client'

import { formatUnits } from 'viem'
import { useWriteContract, usePublicClient } from 'wagmi'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { ADDRESSES, DEMO_POOL_KEY } from '@/lib/addresses'
import { PRISM_HOOK_ABI, PRISM_ROUTER_ABI } from '@/lib/abis'

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const
const BLOCKSCOUT = 'https://unichain-sepolia.blockscout.com/tx/'

interface ClaimPanelProps {
  posId: `0x${string}`
  ilComp: bigint
  lpdClaimable: bigint
  lpDFees: { amount0: bigint; amount1: bigint }
  settled: boolean
  lpDHolder: `0x${string}`
  account: `0x${string}`
  tickLower: number
  tickUpper: number
  liquidity: bigint
}

export function ClaimPanel({
  posId, ilComp, lpdClaimable, lpDFees, settled,
  lpDHolder, account, tickLower, tickUpper, liquidity,
}: ClaimPanelProps) {
  const client = usePublicClient({ chainId: 1301 })
  const { writeContractAsync: write } = useWriteContract()
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLPDHolder = lpDHolder.toLowerCase() === account.toLowerCase()
  const hasLPDFees  = lpDFees.amount0 > 0n || lpDFees.amount1 > 0n

  if (!ADDRESSES.PrismHook) return null
  if (ilComp === 0n && lpdClaimable === 0n && !hasLPDFees && !isLPDHolder && settled) return null

  const hook = ADDRESSES.PrismHook

  async function exec(key: string, label: string, fn: () => Promise<`0x${string}`>) {
    setLoading(key)
    try {
      const tx = await fn()
      const receipt = await client?.waitForTransactionReceipt({ hash: tx })
      if (receipt?.status === 'reverted') throw new Error('Transaction reverted on-chain')
      toast.success(label, {
        description: 'Transaction confirmed',
        action: { label: 'View ↗', onClick: () => window.open(BLOCKSCOUT + tx, '_blank') },
      })
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      toast.error('Transaction failed', { description: msg.slice(0, 120) })
    } finally {
      setLoading(null)
    }
  }

  function handleRemoveClick() {
    if (confirmRemove) {
      exec('remove', 'Liquidity removed', () => write({
        address: ADDRESSES.PrismRouter!,
        abi: PRISM_ROUTER_ABI,
        functionName: 'removeLiquidity',
        args: [
          DEMO_POOL_KEY,
          { tickLower, tickUpper, liquidityDelta: -liquidity, salt: ZERO_BYTES32 },
          posId,
        ],
        chainId: 1301,
      }))
      setConfirmRemove(false)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    } else {
      setConfirmRemove(true)
      confirmTimer.current = setTimeout(() => setConfirmRemove(false), 3000)
    }
  }

  const hasClaimActions = ilComp > 0n || !settled || (isLPDHolder && (lpdClaimable > 0n || hasLPDFees))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 16 }}>

      {/* IL Compensation */}
      {ilComp > 0n && (
        <ActionRow
          accentColor="var(--positive)"
          mutedBg="var(--positive-muted)"
          mutedBorder="rgba(22,163,74,0.25)"
          label="IL Compensation"
          value={`${formatUnits(ilComp, 6)} USDC`}
          btnLabel="Claim"
          loading={loading === 'il'}
          onClick={() => exec('il', `Claimed ${formatUnits(ilComp, 6)} USDC IL compensation`, () =>
            write({ address: hook, abi: PRISM_HOOK_ABI, functionName: 'claimILCompensation', args: [posId], chainId: 1301 })
          )}
        />
      )}

      {/* Swap Fees (LP-Y share) */}
      {!settled && (
        <ActionRow
          accentColor="var(--text-secondary)"
          mutedBg="var(--bg-raised)"
          mutedBorder="var(--border-subtle)"
          label="Swap Fees"
          value="LP-Y share"
          btnLabel="Claim Fees"
          loading={loading === 'fees-y'}
          onClick={() => exec('fees-y', 'Swap fees claimed', () =>
            write({ address: ADDRESSES.PrismRouter!, abi: PRISM_ROUTER_ABI, functionName: 'claimFees', args: [DEMO_POOL_KEY, posId, hook], chainId: 1301 })
          )}
        />
      )}

      {/* LP-D Settle */}
      {isLPDHolder && !settled && lpdClaimable === 0n && (
        <ActionRow
          accentColor="var(--lpd-base)"
          mutedBg="var(--lpd-muted)"
          mutedBorder="var(--lpd-border)"
          label="You hold LP-D"
          value="settle to unlock collateral"
          btnLabel="Settle"
          loading={loading === 'settle'}
          onClick={() => exec('settle', 'LP-D settled', () =>
            write({ address: hook, abi: PRISM_HOOK_ABI, functionName: 'settleLPD', args: [posId], chainId: 1301 })
          )}
        />
      )}

      {/* LP-D Collateral claim */}
      {isLPDHolder && lpdClaimable > 0n && (
        <ActionRow
          accentColor="var(--vault-base)"
          mutedBg="var(--vault-muted)"
          mutedBorder="var(--vault-border)"
          label="LP-D Collateral"
          value={`${formatUnits(lpdClaimable, 6)} USDC`}
          btnLabel="Claim"
          loading={loading === 'lpd'}
          onClick={() => exec('lpd', `Claimed ${formatUnits(lpdClaimable, 6)} USDC collateral`, () =>
            write({ address: hook, abi: PRISM_HOOK_ABI, functionName: 'claimLPDCollateral', args: [posId], chainId: 1301 })
          )}
        />
      )}

      {/* LP-D Fee share */}
      {isLPDHolder && hasLPDFees && (
        <ActionRow
          accentColor="var(--lpy-base)"
          mutedBg="var(--lpy-muted)"
          mutedBorder="var(--lpy-border)"
          label="LP-D Fee Share"
          value={[
            lpDFees.amount0 > 0n ? `${formatUnits(lpDFees.amount0, 6)} USDC` : '',
            lpDFees.amount1 > 0n ? `${formatUnits(lpDFees.amount1, 6)} PRISM` : '',
          ].filter(Boolean).join(' + ')}
          btnLabel="Claim Fees"
          loading={loading === 'fees-d'}
          onClick={() => exec('fees-d', 'LP-D fees claimed', () =>
            write({ address: hook, abi: PRISM_HOOK_ABI, functionName: 'claimFeesLPD', args: [DEMO_POOL_KEY, posId], chainId: 1301 })
          )}
        />
      )}

      {/* Remove Liquidity */}
      {!settled && ADDRESSES.PrismRouter && liquidity > 0n && (
        <div style={hasClaimActions ? { borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 4 } : {}}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: confirmRemove ? 'var(--negative-muted)' : 'var(--bg-raised)',
            border: `1px solid ${confirmRemove ? 'rgba(220,38,38,0.3)' : 'var(--border-subtle)'}`,
            transition: 'background 150ms, border-color 150ms',
          }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: confirmRemove ? 'var(--negative)' : 'var(--text-tertiary)' }}>
                {confirmRemove ? 'This is irreversible' : 'Remove Liquidity'}
              </p>
              <p style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                exit position
              </p>
            </div>
            <button
              disabled={loading === 'remove'}
              onClick={handleRemoveClick}
              style={{
                padding: '6px 12px', fontSize: 12, cursor: loading === 'remove' ? 'not-allowed' : 'pointer',
                background: confirmRemove ? 'var(--negative)' : 'none',
                border: `1px solid ${confirmRemove ? 'var(--negative)' : 'var(--border-default)'}`,
                color: confirmRemove ? '#F2F2F2' : 'var(--text-secondary)',
                opacity: loading === 'remove' ? 0.5 : 1,
                transition: 'background 150ms, border-color 150ms, color 150ms',
              }}
            >
              {loading === 'remove' ? '…' : confirmRemove ? 'Confirm Remove' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionRow({ accentColor, mutedBg, mutedBorder, label, value, btnLabel, loading, onClick }: {
  accentColor: string
  mutedBg: string
  mutedBorder: string
  label: string
  value: string
  btnLabel: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: mutedBg, border: `1px solid ${mutedBorder}`,
    }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: accentColor }}>{label}</p>
        <p style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{value}</p>
      </div>
      <button
        disabled={loading}
        onClick={onClick}
        style={{
          padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
          background: accentColor, border: 'none', color: '#080808',
          opacity: loading ? 0.5 : 1, transition: 'opacity 150ms',
        }}
      >
        {loading ? '…' : btnLabel}
      </button>
    </div>
  )
}
