'use client'
import { useAllBids, useWinningBid, type BidWithId } from '@/hooks/useAllBids'
import { formatAddress } from '@/lib/format'

interface BidListProps {
  poolId: `0x${string}` | undefined
  connectedAddress?: `0x${string}`
}

export function BidList({ poolId, connectedAddress }: BidListProps) {
  const { bids, isLoading } = useAllBids(poolId)
  const winning = useWinningBid(poolId)

  const activeBids = [...bids]
    .filter(b => b.active)
    .sort((a, b) => b.score - a.score)

  if (isLoading && activeBids.length === 0) {
    return (
      <div style={{ padding: '12px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ height: 10, width: '40%', background: 'var(--bg-overlay)', animation: 'live-pulse 1.4s ease-in-out infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <span className="text-label" style={{ color: 'var(--text-tertiary)' }}>ACTIVE BIDS</span>
        <span className="text-small" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>
          {activeBids.length} {activeBids.length === 1 ? 'bidder' : 'bidders'} · auto-fill on deposit
        </span>
      </div>

      {activeBids.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>
            No active bids. Post one on the{' '}
            <a href="/app/lpd" style={{ color: 'var(--lpy-base)', textDecoration: 'underline' }}>LP-D page</a>.
          </p>
        </div>
      ) : (
        <div>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 90px 90px 100px 70px',
            padding: '6px 16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {['BIDDER', 'COVERAGE', 'FEE SHARE', 'REMAINING', 'SCORE'].map(h => (
              <span key={h} className="text-label" style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>{h}</span>
            ))}
          </div>

          {/* Bid rows */}
          {activeBids.map(bid => (
            <BidRow
              key={String(bid.bidId)}
              bid={bid}
              isWinning={winning?.bidId === bid.bidId}
              isOwn={!!connectedAddress && bid.bidder.toLowerCase() === connectedAddress.toLowerCase()}
            />
          ))}

          {/* No coverage row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 90px 90px 100px 70px',
            padding: '10px 16px',
            borderTop: '1px solid var(--border-subtle)',
            opacity: 0.45,
          }}>
            <span className="text-small" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              No coverage — keep LP-Y + LP-D
            </span>
            <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>—</span>
            <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>100%</span>
            <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>—</span>
            <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>—</span>
          </div>
        </div>
      )}
    </div>
  )
}

function BidRow({ bid, isWinning, isOwn }: { bid: BidWithId; isWinning: boolean; isOwn: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 90px 90px 100px 70px',
      padding: '10px 16px',
      borderBottom: '1px solid var(--border-subtle)',
      borderLeft: isWinning ? '2px solid var(--positive)' : '2px solid transparent',
      background: isWinning ? 'rgba(22,163,74,0.04)' : 'transparent',
      transition: 'background 150ms',
    }}>
      {/* Bidder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          className="text-mono-sm"
          style={{ color: isOwn ? 'var(--lpy-base)' : 'var(--text-secondary)' }}
          title={bid.bidder}
        >
          {formatAddress(bid.bidder)}
        </span>
        {isOwn && (
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
            color: 'var(--lpy-base)', padding: '1px 5px',
            border: '1px solid rgba(139,92,246,0.3)',
          }}>YOU</span>
        )}
        {isWinning && (
          <span style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
            color: 'var(--positive)', padding: '1px 5px',
            border: '1px solid rgba(22,163,74,0.3)',
          }}>AUTO-SELECT</span>
        )}
      </div>

      {/* Coverage */}
      <span className="text-mono-sm" style={{ color: isWinning ? 'var(--positive)' : 'var(--text-primary)' }}>
        {bid.coveragePercent}
      </span>

      {/* Fee share */}
      <span className="text-mono-sm" style={{ color: 'var(--text-secondary)' }}>
        {bid.feeSharePercent}
      </span>

      {/* Remaining */}
      <div>
        <span className="text-mono-sm" style={{ color: 'var(--text-secondary)' }}>
          {bid.remainingFormatted}
        </span>
        {bid.maxCollateral > 0n && (
          <div style={{ marginTop: 3, height: 2, background: 'var(--bg-overlay)', overflow: 'hidden', borderRadius: 1 }}>
            <div style={{
              height: '100%',
              width: `${bid.maxCollateral > 0n ? 100 - Math.round(Number(bid.remaining * 100n / bid.maxCollateral)) : 0}%`,
              background: 'var(--vault-base)',
            }} />
          </div>
        )}
      </div>

      {/* Score */}
      <span className="text-mono-sm" style={{ color: 'var(--text-tertiary)' }}>
        {bid.score.toLocaleString()}
      </span>
    </div>
  )
}
