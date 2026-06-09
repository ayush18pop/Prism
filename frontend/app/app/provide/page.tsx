'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ADDRESSES } from '@/lib/addresses'
import { BidStatusBanner, SectionLabel, SplitVisualizer, TokenPill, StatusBadge, AddressChip, StatCard } from '@/components/ui/index'
import { DepositForm } from '@/components/position/DepositForm'
import { ClaimPanel } from '@/components/position/ClaimPanel'
import { TransferPanel } from '@/components/position/TransferPanel'
import { useStandingBid } from '@/hooks/useStandingBid'
import { usePositionList } from '@/hooks/usePositionList'
import { usePositionData } from '@/hooks/usePositionData'
import { usePoolPrice } from '@/hooks/usePoolPrice'

export default function ProvidePage() {
  const { address, isConnected } = useAccount()
  const bid = useStandingBid(ADDRESSES.poolId)
  const { sqrtPriceX96, tick } = usePoolPrice()
  const { positions, isLoading: positionsLoading } = usePositionList(address)
  const [showSettled, setShowSettled] = useState(false)

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>LP PROVIDER</p>
        <h1 className="text-display" style={{ color: 'var(--text-primary)' }}>Provide</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

        {/* ── LEFT: deposit form ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* BidStatusBanner — FIRST ELEMENT, most prominent */}
          {bid.active ? (
            <BidStatusBanner status="active" bid={{
              pricePerUnit: bid.coverageFraction ?? 0,
              feeShareBps: bid.feeShareBps,
              maxCollateral: bid.maxCollateral,
              usedCollateral: bid.usedCollateral,
              remainingCollateral: bid.remainingCollateral,
            }} />
          ) : (
            <BidStatusBanner status="none" />
          )}

          {/* Deposit form */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 24 }}>
            <SectionLabel label="ADD LIQUIDITY" />
            {!isConnected ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Connect to deposit</p>
                <ConnectButton />
              </div>
            ) : (
              <>
                <DepositForm />
                {/* Token receipt preview */}
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-small" style={{ color: 'var(--text-tertiary)', marginBottom: 10 }}>After deposit you will hold:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TokenPill variant="lpy" />
                      <span className="text-small" style={{ color: 'var(--text-secondary)' }}>LP-Y · earns fees · zero IL</span>
                    </div>
                    {bid.active ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TokenPill variant="lpd" />
                        <span className="text-small" style={{ color: 'var(--positive)' }}>auto-sold → bid fills automatically</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TokenPill variant="lpd" />
                        <span className="text-small" style={{ color: 'var(--text-secondary)' }}>LP-D · IL exposure (no bid active)</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: positions ───────────────────────────────── */}
        <div>
          <SectionLabel label={`YOUR POSITIONS ${positions.length > 0 ? `(${positions.length})` : ''}`} />

          {!isConnected ? (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '32px', textAlign: 'center' }}>
              <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>Connect to see your positions</p>
            </div>
          ) : positionsLoading ? (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[40, 60, 50].map((w, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 12, background: 'var(--bg-raised)', width: `${w}%`, animation: 'live-pulse 1.6s ease-in-out infinite' }} />
                  <div style={{ height: 10, background: 'var(--bg-raised)', width: `${w + 15}%`, opacity: 0.6, animation: 'live-pulse 1.6s ease-in-out 200ms infinite' }} />
                </div>
              ))}
              <p className="text-small" style={{ color: 'var(--text-tertiary)', marginTop: 4 }}>Scanning on-chain events…</p>
            </div>
          ) : positions.length === 0 ? (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '48px 24px', textAlign: 'center' }}>
              <p className="text-body" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>No positions found.</p>
              <p className="text-small" style={{ color: 'var(--text-tertiary)' }}>Deposit liquidity above to open your first position.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Active positions */}
              {positions.map(({ posId }) => (
                <PositionCardRedesigned
                  key={posId}
                  posId={posId}
                  account={address!}
                  sqrtPriceX96={sqrtPriceX96}
                  tick={tick}
                  hideIfSettled
                />
              ))}

              {/* Settled positions toggle */}
              <button
                onClick={() => setShowSettled(s => !s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                  cursor: 'pointer', padding: '8px 0', width: '100%',
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--text-tertiary)', transition: 'color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
              >
                <span style={{ display: 'inline-block', transition: 'transform 200ms', transform: showSettled ? 'rotate(90deg)' : 'none' }}>›</span>
                {showSettled ? 'Hide settled positions' : 'Show settled positions'}
              </button>

              {/* Settled positions — only rendered when expanded */}
              {showSettled && positions.map(({ posId }) => (
                <PositionCardRedesigned
                  key={`settled-${posId}`}
                  posId={posId}
                  account={address!}
                  sqrtPriceX96={sqrtPriceX96}
                  tick={tick}
                  showOnlySettled
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PositionCard ────────────────────────────────────────────────
function PositionCardRedesigned({
  posId, account, sqrtPriceX96, tick, hideIfSettled, showOnlySettled,
}: {
  posId: `0x${string}`
  account: `0x${string}`
  sqrtPriceX96: bigint
  tick: number
  hideIfSettled?: boolean
  showOnlySettled?: boolean
}) {
  const pos = usePositionData(posId, account, sqrtPriceX96, tick)

  if (!pos.exists || pos.isLoading) return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 20 }}>
      <div style={{ height: 14, background: 'var(--bg-raised)', width: '40%', marginBottom: 8 }} />
      <div style={{ height: 10, background: 'var(--bg-raised)', width: '60%' }} />
    </div>
  )

  // Filter by settled state
  if (hideIfSettled && pos.settled) return null
  if (showOnlySettled && !pos.settled) return null

  const { tickLower, tickUpper, inRange, settled, lpDSold, liquidity,
          collateralVault, collateralVaultRaw, ilCompensationRaw = 0n, ilCompensation,
          currentIL, currentILIsNegative, positionValueUSD,
          lpyBalance, lpdBalance, hasLPY, hasLPD, lpDHolder, lpdFees } = pos

  const lpyPct = lpDSold ? 100 : 50
  const lpdPct = lpDSold ? 0 : 50
  const vaultVal = Number(collateralVaultRaw) / 1e6

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      opacity: settled ? 0.7 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasLPY && <TokenPill variant="lpy" />}
          {hasLPD && <TokenPill variant="lpd" />}
          {lpDSold && !hasLPD && <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>LP-D sold</span>}
          <AddressChip address={posId} />
        </div>
        <StatusBadge status={settled ? 'settled' : inRange ? 'in-range' : 'out-of-range'} />
      </div>

      {/* SplitVisualizer */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <SplitVisualizer lpyValue={lpyPct} lpdValue={lpdPct} vaultValue={vaultVal} size="sm" />
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span className="text-mono-sm" style={{ color: 'var(--text-tertiary)' }}>[{tickLower}, {tickUpper}]</span>
          <span className="text-mono-sm" style={{ color: 'var(--text-tertiary)' }}>tick {tick}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {[
          { label: 'Position Value', value: (positionValueUSD ?? '--') as string, format: 'raw' as const },
          {
            label: 'IL Accrued',
            value: (currentILIsNegative ? currentIL : '+0.0%') as string,
            format: 'raw' as const,
            accent: currentILIsNegative ? 'var(--negative)' : 'var(--positive)',
            subtext: lpDSold && currentILIsNegative ? 'covered by vault' : undefined,
          },
          {
            label: lpDSold ? 'Vault Remaining' : 'Collateral',
            value: (lpDSold ? collateralVault : '--') as string,
            format: 'raw' as const,
            accent: 'var(--vault-base)',
          },
          {
            label: 'IL Compensation',
            value: (ilCompensationRaw > 0n ? ilCompensation : '--') as string,
            format: 'raw' as const,
            accent: ilCompensationRaw > 0n ? 'var(--positive)' : undefined,
          },
        ].map((stat, i) => (
          <div key={stat.label} style={{
            padding: '14px 20px',
            borderRight: i % 2 === 0 ? '1px solid var(--border-subtle)' : 'none',
            borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
            background: 'var(--bg-raised)',
          }}>
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 20px' }}>
        <ClaimPanel
          posId={posId}
          ilComp={ilCompensationRaw}
          lpdClaimable={0n}
          lpDFees={lpdFees ? { amount0: lpdFees[0], amount1: lpdFees[1] } : { amount0: 0n, amount1: 0n }}
          settled={settled ?? false}
          lpDHolder={lpDHolder ?? '0x0000000000000000000000000000000000000000'}
          account={account}
          tickLower={tickLower ?? 0}
          tickUpper={tickUpper ?? 0}
          liquidity={(liquidity ?? 0n) as bigint}
        />
        {(hasLPY || hasLPD) && (
          <TransferPanel
            posId={posId}
            account={account}
            lpYBal={lpyBalance}
            lpDBal={lpdBalance}
          />
        )}
      </div>
    </div>
  )
}
