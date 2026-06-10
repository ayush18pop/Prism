'use client'
import { useState } from 'react'
import { useWriteContract, usePublicClient } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useMyBids, type BidWithId } from '@/hooks/useAllBids'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI } from '@/lib/abis'

const BLOCKSCOUT = 'https://unichain-sepolia.blockscout.com/tx/'

interface MyBidsProps {
  poolId: `0x${string}` | undefined
  address: `0x${string}` | undefined
}

export function MyBids({ poolId, address }: MyBidsProps) {
  const { bids, isLoading } = useMyBids(poolId, address)

  if (!address) return null

  if (isLoading && bids.length === 0) {
    return (
      <div style={{ padding: '16px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <div style={{ height: 10, width: '30%', background: 'var(--bg-raised)', animation: 'live-pulse 1.4s ease-in-out infinite' }} />
      </div>
    )
  }

  if (bids.length === 0) {
    return (
      <div style={{ padding: '16px 20px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
        <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>
          No active bids. Use the form above to post one.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bids.map(bid => (
        <BidCard key={String(bid.bidId)} bid={bid} poolId={poolId} />
      ))}
    </div>
  )
}

function BidCard({ bid, poolId }: { bid: BidWithId; poolId: `0x${string}` | undefined }) {
  const [confirm, setConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const client = usePublicClient({ chainId: 1301 })
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()

  const utilPct = bid.maxCollateral > 0n
    ? Number(bid.usedCollateral * 100n / bid.maxCollateral)
    : 0

  async function handleCancel() {
    if (!poolId || !ADDRESSES.PrismHook || !client) return
    setCancelling(true)
    try {
      const tx = await writeContractAsync({
        address: ADDRESSES.PrismHook,
        abi: PRISM_HOOK_ABI,
        functionName: 'cancelBid',
        args: [poolId, bid.bidId],
        chainId: 1301,
      })
      const receipt = await client.waitForTransactionReceipt({ hash: tx })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted')
      // Invalidate all bid queries so BidList and MyBids refresh immediately
      queryClient.invalidateQueries({ queryKey: ['bid', ADDRESSES.PrismHook, poolId] })
      setConfirm(false)
      toast.success('Bid cancelled — USDC refunded', {
        action: { label: 'View ↗', onClick: () => window.open(BLOCKSCOUT + tx, '_blank') },
      })
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      toast.error('Cancel failed', { description: msg.slice(0, 120) })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-label" style={{ color: 'var(--text-tertiary)' }}>BID #{String(bid.bidId)}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
            padding: '1px 6px',
            background: 'rgba(22,163,74,0.12)', color: 'var(--positive)',
            border: '1px solid rgba(22,163,74,0.25)',
          }}>ACTIVE</span>
        </div>

        {/* Cancel controls */}
        {confirm ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="text-small" style={{ color: 'var(--text-secondary)' }}>
              Reclaim {bid.remainingFormatted}?
            </span>
            <button
              onClick={() => setConfirm(false)}
              style={{ padding: '4px 10px', fontSize: 11, background: 'none', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Keep
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{ padding: '4px 10px', fontSize: 11, background: 'none', border: '1px solid rgba(220,38,38,0.4)', color: 'var(--negative)', cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.5 : 1 }}
            >
              {cancelling ? '…' : 'Confirm'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{ padding: '4px 12px', fontSize: 11, background: 'none', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.4)'; (e.currentTarget as HTMLElement).style.color = 'var(--negative)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
          >
            Cancel · reclaim {bid.remainingFormatted}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
        <Stat label="COVERAGE" value={bid.coveragePercent} accent="var(--positive)" />
        <Stat label="FEE SHARE" value={bid.feeSharePercent} />
        <Stat label="SCORE" value={bid.score.toLocaleString()} />
      </div>

      {/* Utilization bar */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="text-small" style={{ color: 'var(--text-secondary)' }}>
            {bid.maxCollateralFormatted} deposited · {bid.remainingFormatted} remaining
          </span>
          <span className="text-mono-sm" style={{ color: 'var(--text-tertiary)' }}>{utilPct.toFixed(1)}% used</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg-raised)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${utilPct}%`,
            background: utilPct > 80 ? 'var(--warning)' : 'var(--vault-base)',
            transition: 'width 400ms ease',
          }} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border-subtle)' }}>
      <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div className="text-mono-md" style={{ color: accent ?? 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
