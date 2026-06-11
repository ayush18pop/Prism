'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { toast } from 'sonner'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI } from '@/lib/abis'
import { SectionLabel, StatusBadge, TokenPill, AddressChip } from '@/components/ui/index'
import { StandingBidForm } from '@/components/lpd/StandingBidForm'
import { MyBids } from '@/components/lpd/MyBids'
import { usePositionList } from '@/hooks/usePositionList'
import { usePositionData } from '@/hooks/usePositionData'
import { usePoolPrice } from '@/hooks/usePoolPrice'
import { usePoolInitialized, computePoolId } from '@/hooks/usePoolInitialized'

// All pools for this hook × fee tier combination (USDC/PRISM)
const POOL_CONFIGS = (() => {
  const u = ADDRESSES.USDC as `0x${string}`
  const p = ADDRESSES.PRISM as `0x${string}`
  const h = ADDRESSES.PrismHook as `0x${string}`
  if (!u || !p || !h) return []
  return [
    { label: '0.01%', fee: 100,   tickSpacing: 1,   poolId: computePoolId(u, p, 100,   1,   h) },
    { label: '0.05%', fee: 500,   tickSpacing: 10,  poolId: computePoolId(u, p, 500,   10,  h) },
    { label: '0.30%', fee: 3000,  tickSpacing: 60,  poolId: computePoolId(u, p, 3000,  60,  h) },
    { label: '1.00%', fee: 10000, tickSpacing: 200, poolId: computePoolId(u, p, 10000, 200, h) },
  ]
})()

export default function LpdPage() {
  const { address, isConnected, chainId } = useAccount()
  const { sqrtPriceX96, tick } = usePoolPrice()
  const { positions } = usePositionList(address)
  const isCorrectNetwork = chainId === 1301
  const [selectedPoolIdx, setSelectedPoolIdx] = useState(2) // default: 0.30%

  const selectedPool = POOL_CONFIGS[selectedPoolIdx]
  const poolStatus = usePoolInitialized(selectedPool?.poolId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── Section 1: Page header ─────────────────────────── */}
      <div>
        <div className="spectrum-bar" style={{ marginBottom: 16, maxWidth: 64 }} />
        <p className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>LP-D BUYER</p>
        <h1 className="text-display" style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Coverage</h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)', maxWidth: 520 }}>
          Set a standing bid to absorb IL and earn fee share from every deposit.
          One transaction. Fills atomically.
        </p>
      </div>

      {/* ── Section 2: Three-step explainer ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { n: '01', title: 'Set a bid', body: 'Deposit USDC. Set your IL coverage and fee share. One transaction.' },
          { n: '02', title: 'Auto-filled', body: 'Every LP deposit that matches your terms fills atomically. Zero manual steps.' },
          { n: '03', title: 'Settle or earn', body: 'Collect fee share every swap. Reclaim collateral when price reverts.' },
        ].map(({ n, title, body }) => (
          <div key={n} style={{ border: '1px solid var(--border-default)', padding: '16px 20px' }}>
            <div className="text-mono-sm" style={{ color: 'var(--text-tertiary)', marginBottom: 10 }}>{n}</div>
            <div className="text-body" style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
            <div className="text-small" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{body}</div>
          </div>
        ))}
      </div>

      {/* ── Section 3: RSC monitoring strip ───────────────── */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--positive)', animation: 'live-pulse 2s ease-in-out infinite' }} />
          <span className="text-mono-sm" style={{ color: 'var(--text-secondary)' }}>
            PrismRSC · Lasna Testnet
          </span>
          <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>
            monitoring {positions.length} positions on Unichain Sepolia
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          }}>
            <span className="text-mono-sm" style={{ color: 'var(--vault-base)' }}>C1</span>
            <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>Price ±1% of entry → settle LP-D</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
          }}>
            <span className="text-mono-sm" style={{ color: 'var(--warning)' }}>C3</span>
            <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>90% drawdown → force settle</span>
          </div>
        </div>
      </div>

      {/* ── Section 4: Active bid OR form ─────────────────── */}
      {/* ── Pool selector ─────────────────────────────────── */}
      <div>
        <div style={{ marginBottom: 10 }}>
          <span className="text-label" style={{ color: 'var(--text-tertiary)' }}>POOL</span>
          <span className="text-small" style={{ color: 'var(--text-tertiary)', marginLeft: 10 }}>
            USDC / PRISM · select fee tier
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {POOL_CONFIGS.map((cfg, i) => {
            const active = selectedPoolIdx === i
            const isThis = selectedPoolIdx === i
            return (
              <button
                key={cfg.fee}
                onClick={() => setSelectedPoolIdx(i)}
                style={{
                  padding: '12px 8px', textAlign: 'center', cursor: 'pointer',
                  background: active ? 'var(--bg-overlay)' : 'var(--bg-surface)',
                  border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                  transition: 'background 150ms, border-color 150ms',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  fontSize: 14, fontWeight: 500,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  marginBottom: 4,
                }}>
                  {cfg.label}
                </div>
                <PoolInitBadge poolId={cfg.poolId} />
              </button>
            )
          })}
        </div>

        {/* Selected pool status */}
        {selectedPool && (
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span className="text-small" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>
              USDC / PRISM · {selectedPool.label} · tickSpacing {selectedPool.tickSpacing}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {poolStatus.isLoading ? (
                <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>checking…</span>
              ) : poolStatus.initialized ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--positive)' }} />
                  <span className="text-small" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>
                    {poolStatus.priceFormatted} · tick {poolStatus.tick}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                  <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>not initialized</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '40px', textAlign: 'center' }}>
          <p className="text-body" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Connect to set a standing bid
          </p>
          <ConnectButton />
        </div>
      ) : !isCorrectNetwork ? (
        <div style={{ padding: '16px', background: 'var(--warning-muted)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <p className="text-body" style={{ fontWeight: 500, color: 'var(--warning)', marginBottom: 4 }}>Wrong Network</p>
          <p className="text-small" style={{ color: 'var(--text-secondary)' }}>Switch to Unichain Sepolia (chain 1301).</p>
        </div>
      ) : !poolStatus.initialized && !poolStatus.isLoading ? (
        <div style={{ padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <p className="text-body" style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>Pool not initialized</p>
          <p className="text-small" style={{ color: 'var(--text-secondary)' }}>
            This pool has not been created yet. Switch to an initialized pool, or deploy and initialize this fee tier first.
          </p>
        </div>
      ) : (
        /* Post form + per-wallet bid management */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: 24 }}>
            <SectionLabel label="POST A BID" />
            <StandingBidForm poolId={selectedPool?.poolId} />
          </div>
          <div>
            <SectionLabel label="YOUR ACTIVE BIDS" />
            <MyBids poolId={selectedPool?.poolId} address={address} />
          </div>
        </div>
      )}

      {/* ── Section 5: LP-D positions ──────────────────────── */}
      {isConnected && (
        <div>
          <SectionLabel label="YOUR LP-D POSITIONS" />
          {positions.length === 0 ? (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', padding: '32px', textAlign: 'center' }}>
              <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
                No LP-D positions yet. Set a standing bid above to start.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {positions.map(({ posId }) => (
                <LpdPositionCard key={posId} posId={posId} account={address!} sqrtPriceX96={sqrtPriceX96} tick={tick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Small badge showing pool initialization status inside the pool selector
function PoolInitBadge({ poolId }: { poolId: `0x${string}` }) {
  const { initialized, isLoading } = usePoolInitialized(poolId)
  if (isLoading) return <div style={{ fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>…</div>
  if (initialized) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--positive)', display: 'inline-block' }} />
      <span style={{ fontSize: 9, color: 'var(--positive)', letterSpacing: '0.06em' }}>live</span>
    </div>
  )
  return <div style={{ fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>not deployed</div>
}

function LpdPositionCard({
  posId, account, sqrtPriceX96, tick,
}: {
  posId: `0x${string}`
  account: `0x${string}`
  sqrtPriceX96: bigint
  tick: number
}) {
  const pos = usePositionData(posId, account, sqrtPriceX96, tick)
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient({ chainId: 1301 })
  const [claiming, setClaiming] = useState(false)

  if (!pos.exists || pos.isLoading) return null
  if (pos.lpDHolder?.toLowerCase() !== account.toLowerCase()) return null

  const { tickLower, tickUpper, inRange, settled, collateralVault, currentIL, currentILIsNegative } = pos
  const hasClaimableCollateral = settled && collateralVault !== '$0.00' && collateralVault !== '--'

  async function claimCollateral() {
    if (!ADDRESSES.PrismHook || !client) return
    setClaiming(true)
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.PrismHook,
        abi: PRISM_HOOK_ABI,
        functionName: 'claimLPDCollateral',
        args: [posId],
        chainId: 1301,
      })
      await client.waitForTransactionReceipt({ hash })
      toast.success('Collateral claimed', { description: collateralVault + ' returned to your wallet' })
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      toast.error('Claim failed', { description: msg.slice(0, 120) })
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TokenPill variant="lpd" />
          <AddressChip address={posId} />
          <span className="text-mono-sm" style={{ color: 'var(--text-tertiary)' }}>[{tickLower}, {tickUpper}]</span>
        </div>
        <StatusBadge status={settled ? 'settled' : inRange ? 'in-range' : 'out-of-range'} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
        {[
          { label: 'Collateral Locked', value: collateralVault, accent: 'var(--vault-base)' },
          { label: 'IL Absorbed', value: currentILIsNegative ? currentIL : '0.0%', accent: currentILIsNegative ? 'var(--negative)' : 'var(--positive)' },
          { label: 'Fee Share', value: `${((pos.feeShareBpsLPD ?? 0) / 100).toFixed(1)}%`, accent: 'var(--lpy-base)' },
          { label: 'Status', value: settled ? 'Settled' : inRange ? 'Active' : 'Out of range', accent: settled ? 'var(--text-tertiary)' : 'var(--positive)' },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: '14px 16px', background: 'var(--bg-raised)',
            borderRight: i < 3 ? '1px solid var(--border-subtle)' : 'none',
          }}>
            <div className="text-label" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>{s.label}</div>
            <div className="text-mono-sm" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Claim collateral — shown only when settled with remaining vault */}
      {hasClaimableCollateral && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="text-small" style={{ color: 'var(--text-secondary)' }}>
            Remaining collateral available to withdraw
          </span>
          <button
            onClick={claimCollateral}
            disabled={claiming}
            style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 500,
              background: claiming ? 'var(--bg-raised)' : 'var(--vault-base)',
              border: '1px solid var(--vault-base)',
              color: claiming ? 'var(--text-secondary)' : 'var(--bg-base)',
              cursor: claiming ? 'not-allowed' : 'pointer',
              transition: 'background 150ms, color 150ms',
            }}
          >
            {claiming ? 'Claiming…' : `Claim ${collateralVault}`}
          </button>
        </div>
      )}
    </div>
  )
}
