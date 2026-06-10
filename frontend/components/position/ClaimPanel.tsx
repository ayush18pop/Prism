'use client'

import { formatUnits } from 'viem'
import { useWriteContract, usePublicClient } from 'wagmi'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { ADDRESSES, DEMO_POOL_KEY } from '@/lib/addresses'
import { PRISM_HOOK_ABI, PRISM_ROUTER_ABI } from '@/lib/abis'
import type { FeeHistory } from '@/hooks/usePrismHook'
import type { PoolKeyStruct } from '@/hooks/usePoolInitialized'

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const
const BLOCKSCOUT = 'https://unichain-sepolia.blockscout.com/tx/'

interface ClaimPanelProps {
  posId: `0x${string}`
  ilComp: bigint
  lpdClaimable: bigint
  lpDFees: { amount0: bigint; amount1: bigint }
  feeHistory?: FeeHistory
  /** unclaimed LP-Y fee share computed from PoolManager storage; legacy = position
   *  was deposited via an older router and can't be claimed through the current one */
  pendingFees?: { lpY0: bigint; lpY1: bigint; legacy: boolean }
  /** the position's actual pool key (resolved from its poolId); falls back to the demo pool */
  poolKey?: PoolKeyStruct
  settled: boolean
  lpDHolder: `0x${string}`
  account: `0x${string}`
  hasLPY: boolean
  tickLower: number
  tickUpper: number
  liquidity: bigint
}

function fmtFee(amount: bigint, decimals: number): string {
  const n = parseFloat(formatUnits(amount, decimals))
  return n < 0.0001 ? '<0.0001' : n.toFixed(4).replace(/\.?0+$/, '')
}

export function ClaimPanel({
  posId, ilComp, lpdClaimable, lpDFees, feeHistory, pendingFees, poolKey, settled,
  lpDHolder, account, hasLPY, tickLower, tickUpper, liquidity,
}: ClaimPanelProps) {
  const client = usePublicClient({ chainId: 1301 })
  const { writeContractAsync: write } = useWriteContract()
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const key = poolKey ?? DEMO_POOL_KEY

  const isLPDHolder = lpDHolder.toLowerCase() === account.toLowerCase()
  const hasLPDFees  = lpDFees.amount0 > 0n || lpDFees.amount1 > 0n

  if (!ADDRESSES.PrismHook) return null
  if (ilComp === 0n && lpdClaimable === 0n && !hasLPDFees && !isLPDHolder && settled) return null

  const hook = ADDRESSES.PrismHook

  async function exec(actionKey: string, label: string, fn: () => Promise<`0x${string}`>) {
    if (!client) { toast.error('No RPC client, check chain connection'); return }
    setLoading(actionKey)
    try {
      const tx = await fn()
      const receipt = await client.waitForTransactionReceipt({ hash: tx })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted on-chain')
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
          key,
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

      {/* Swap Fees (LP-Y share) — only shown if this wallet actually holds LP-Y */}
      {!settled && hasLPY && (
        <ActionRow
          accentColor="var(--text-secondary)"
          mutedBg="var(--bg-raised)"
          mutedBorder="var(--border-subtle)"
          label="Swap Fees · LP-Y"
          value={(() => {
            if (pendingFees?.legacy) return 'legacy position — exit and redeposit'
            const parts = [
              pendingFees && pendingFees.lpY0 > 0n ? `${fmtFee(pendingFees.lpY0, 6)} USDC` : '',
              pendingFees && pendingFees.lpY1 > 0n ? `${fmtFee(pendingFees.lpY1, 6)} PRISM` : '',
            ].filter(Boolean)
            return parts.length > 0 ? parts.join(' + ') : 'accumulating...'
          })()}
          sublabel={feeHistory && feeHistory.claimCount > 0
            ? `${[
                feeHistory.lpYTotal0 > 0n ? `${fmtFee(feeHistory.lpYTotal0, 6)} USDC` : '',
                feeHistory.lpYTotal1 > 0n ? `${fmtFee(feeHistory.lpYTotal1, 6)} PRISM` : '',
              ].filter(Boolean).join(' + ') || '0'} claimed across ${feeHistory.claimCount} claim${feeHistory.claimCount !== 1 ? 's' : ''}`
            : undefined}
          btnLabel="Claim Fees"
          loading={loading === 'fees-y'}
          disabled={pendingFees?.legacy}
          onClick={() => exec('fees-y', 'Swap fees claimed', () =>
            write({ address: ADDRESSES.PrismRouter!, abi: PRISM_ROUTER_ABI, functionName: 'claimFees', args: [key, posId, hook], chainId: 1301 })
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
          accentColor="var(--lpd-base)"
          mutedBg="var(--lpd-muted)"
          mutedBorder="var(--lpd-border)"
          label="Swap Fees · LP-D"
          value={[
            lpDFees.amount0 > 0n ? `${fmtFee(lpDFees.amount0, 6)} USDC` : '',
            lpDFees.amount1 > 0n ? `${fmtFee(lpDFees.amount1, 6)} PRISM` : '',
          ].filter(Boolean).join(' + ')}
          sublabel={feeHistory && (feeHistory.lpDTotal0 > 0n || feeHistory.lpDTotal1 > 0n)
            ? `${[
                feeHistory.lpDTotal0 > 0n ? `${fmtFee(feeHistory.lpDTotal0, 6)} USDC` : '',
                feeHistory.lpDTotal1 > 0n ? `${fmtFee(feeHistory.lpDTotal1, 6)} PRISM` : '',
              ].filter(Boolean).join(' + ')} earned total`
            : undefined}
          btnLabel="Claim"
          loading={loading === 'fees-d'}
          onClick={() => exec('fees-d', 'LP-D fees claimed', () =>
            write({ address: hook, abi: PRISM_HOOK_ABI, functionName: 'claimFeesLPD', args: [key, posId], chainId: 1301 })
          )}
        />
      )}

      {/* Remove Liquidity — only the LP-Y holder (depositor) can remove */}
      {!settled && hasLPY && ADDRESSES.PrismRouter && liquidity > 0n && (
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
                {pendingFees?.legacy ? 'legacy position — exit via old router' : 'exit position'}
              </p>
            </div>
            <button
              disabled={loading === 'remove' || pendingFees?.legacy}
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

function ActionRow({ accentColor, mutedBg, mutedBorder, label, value, sublabel, btnLabel, loading, disabled, onClick }: {
  accentColor: string
  mutedBg: string
  mutedBorder: string
  label: string
  value: string
  sublabel?: string
  btnLabel: string
  loading: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const inactive = loading || disabled
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: mutedBg, border: `1px solid ${mutedBorder}`,
    }}>
      <div>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: accentColor }}>{label}</p>
        <p style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{value}</p>
        {sublabel && (
          <p style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{sublabel}</p>
        )}
      </div>
      <button
        disabled={inactive}
        onClick={onClick}
        style={{
          padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: inactive ? 'not-allowed' : 'pointer',
          background: accentColor, border: 'none', color: '#080808',
          opacity: inactive ? 0.5 : 1, transition: 'opacity 150ms',
        }}
      >
        {loading ? '…' : btnLabel}
      </button>
    </div>
  )
}
