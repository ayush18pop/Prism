'use client'

import { useAccount, useReadContract } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { PoolStats } from '@/components/pool/PoolStats'
import { StandingBidForm } from '@/components/lpd/StandingBidForm'
import { PositionCard } from '@/components/position/PositionCard'
import { usePositionLogs } from '@/hooks/usePrismHook'
import { ADDRESSES } from '@/lib/addresses'

const DEMO_POOL_ID: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000'

const POOL_MANAGER_ABI = [
  { name: 'getSlot0', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }, { name: 'protocolFee', type: 'uint24' }, { name: 'lpFee', type: 'uint24' }] },
] as const

export default function AppPage() {
  const { address, isConnected } = useAccount()
  const { data: posLogs } = usePositionLogs()

  const { data: slot0 } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: POOL_MANAGER_ABI,
    functionName: 'getSlot0',
    args: [DEMO_POOL_ID],
    chainId: 1301,
    query: { enabled: !!ADDRESSES.PoolManager, refetchInterval: 5_000 },
  })

  const currentSqrtPrice = slot0?.[0] ?? 0n
  const positions = posLogs?.map(log => log.args.posId as `0x${string}`) ?? []

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* App navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="font-display text-xl text-white tracking-tight">Prism</a>
          <div className="liquid-glass rounded-full px-1 py-1">
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>
        </div>
      </nav>

      {/* Pre-deployment banner */}
      {!ADDRESSES.PrismHook && (
        <div className="border-b border-amber-900/30 bg-amber-950/10 px-6 py-2 text-center text-xs text-amber-400/70">
          Contracts not deployed — run <code className="font-mono">forge script Deploy.s.sol --broadcast</code> and update addresses.ts
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-12">

        {/* Pool State */}
        <section>
          <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-5">Pool State</p>
          <PoolStats poolId={DEMO_POOL_ID} />
        </section>

        {/* Protocol */}
        {isConnected && (
          <section>
            <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-5">Protocol</p>
            <StandingBidForm poolId={DEMO_POOL_ID} />
          </section>
        )}

        {/* Positions */}
        <section>
          <div className="flex items-baseline gap-3 mb-5">
            <p className="text-xs text-white/30 uppercase tracking-[0.2em]">Active Positions</p>
            {positions.length > 0 && (
              <span className="text-xs text-white/20">{positions.length}</span>
            )}
          </div>

          {positions.length === 0 ? (
            <div className="border border-white/5 rounded-2xl py-16 text-center">
              <p className="text-sm text-white/20">No positions yet.</p>
              <p className="text-xs text-white/10 mt-1">Deposit liquidity via Uniswap v4 to see positions here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {positions.map(posId => (
                <PositionCard
                  key={posId}
                  posId={posId}
                  currentSqrtPrice={currentSqrtPrice}
                  account={address ?? '0x0000000000000000000000000000000000000000'}
                />
              ))}
            </div>
          )}
        </section>

        {/* Reactive Network */}
        <section>
          <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-5">Reactive Network</p>
          <div className="border border-white/8 bg-white/[0.02] rounded-2xl px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm text-white/60">PrismRSC monitoring pool on Lasna testnet</p>
            </div>
            <p className="mt-2 text-xs text-white/20">
              Cond-1 price reversion (±1%) · Cond-3 90% vault drawdown → forced settlement
            </p>
          </div>
        </section>

      </main>
    </div>
  )
}
