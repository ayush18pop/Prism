'use client'

import { formatUnits } from 'viem'
import { useReadContract } from 'wagmi'
import { ILStatusBadge } from './ILStatusBadge'
import { ClaimPanel } from './ClaimPanel'
import { TransferPanel } from './TransferPanel'
import { usePosition, useVault, useILCompensation, useLPDClaimable, useLPDFeesClaimable, useFeeHistory } from '@/hooks/usePrismHook'
import { ADDRESSES } from '@/lib/addresses'
import { ERC1155_ABI } from '@/lib/abis'

interface PositionCardProps {
  posId: `0x${string}`
  currentSqrtPrice: bigint
  currentTick: number | null
  account: `0x${string}`
  initialCollateral?: bigint
}

export function PositionCard({ posId, currentSqrtPrice, currentTick, account, initialCollateral }: PositionCardProps) {
  const { data: pos }          = usePosition(posId)
  const { data: vault }        = useVault(posId)
  const { data: ilComp }       = useILCompensation(posId)
  const { data: lpdClaimable } = useLPDClaimable(posId)
  const { data: lpDFees }      = useLPDFeesClaimable(posId)
  const { data: feeHistory }   = useFeeHistory(posId, pos?.feeShareBpsLPD ? Number(pos.feeShareBpsLPD) : 0)

  const { data: lpYBal } = useReadContract({
    address: ADDRESSES.LPYToken,
    abi: ERC1155_ABI,
    functionName: 'balanceOf',
    args: [account, BigInt(`0x${posId.slice(2)}`)],
    chainId: 1301,
  })
  const { data: lpDBal } = useReadContract({
    address: ADDRESSES.LPDToken,
    abi: ERC1155_ABI,
    functionName: 'balanceOf',
    args: [account, BigInt(`0x${posId.slice(2)}`)],
    chainId: 1301,
  })

  if (!pos) return null

  const { settled, lpDSold, tickLower, tickUpper, lpDHolder, liquidity } = pos

  const inRange = currentTick !== null && currentTick >= tickLower && currentTick <= tickUpper
  const isLPYHolder  = lpYBal != null && lpYBal > 0n
  const isLPDHolder  = lpDBal != null && lpDBal > 0n

  const vaultUsd   = vault != null ? parseFloat(formatUnits(vault, 6)) : 0
  const initUsd    = initialCollateral != null && initialCollateral > 0n
    ? parseFloat(formatUnits(initialCollateral, 6))
    : null
  const vaultFillPct = initUsd != null && initUsd > 0
    ? Math.min(100, Math.max(0, (vaultUsd / initUsd) * 100))
    : null

  return (
    <div className={`glass-panel rounded-2xl transition-opacity ${settled ? 'opacity-40' : ''}`}>

      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.04]">
        <div>
          <p className="font-mono text-[10px] text-white/30">{posId.slice(0, 10)}…{posId.slice(-6)}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {isLPYHolder && <TokenPill label="LP-Y" color="emerald" />}
            {isLPDHolder && <TokenPill label="LP-D" color="violet" />}
            {lpDSold && !isLPDHolder && <TokenPill label="LP-D sold" color="neutral" />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {settled ? (
            <StatusChip label="Settled" color="neutral" />
          ) : currentTick !== null ? (
            <StatusChip
              label={inRange ? 'In Range' : 'Out of Range'}
              color={inRange ? 'emerald' : 'amber'}
              pulse={inRange}
            />
          ) : null}
        </div>
      </div>

      {/* IL badge — hero */}
      {!settled && currentSqrtPrice > 0n && pos.entrySqrtPrice > 0n && (
        <div className="flex items-center justify-center px-5 py-4 border-b border-white/[0.04]">
          <ILStatusBadge
            entrySqrtPrice={pos.entrySqrtPrice}
            currentSqrtPrice={currentSqrtPrice}
            lpDSold={lpDSold}
            size="lg"
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.04] border-b border-white/[0.04]">
        <StatCell label="Tick Range" value={`[${tickLower}, ${tickUpper}]`} mono />
        <StatCell label="Liquidity" value={liquidity.toString()} mono dim />
        <StatCell
          label="Collateral Vault"
          value={vaultUsd > 0 ? `${vaultUsd.toFixed(2)} USDC` : '--'}
          extra={vaultFillPct != null && (
            <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500/60 transition-all duration-500"
                style={{ width: `${vaultFillPct}%` }}
              />
            </div>
          )}
        />
        <StatCell
          label="IL Compensation"
          value={(ilComp ?? 0n) > 0n ? `${formatUnits(ilComp!, 6)} USDC` : '--'}
          highlight={(ilComp ?? 0n) > 0n}
        />
        {feeHistory && (feeHistory.lpYTotal0 > 0n || feeHistory.lpYTotal1 > 0n ||
                        feeHistory.lpDTotal0 > 0n || feeHistory.lpDTotal1 > 0n) && (
          <StatCell
            label="Fees Earned (total)"
            value={[
              (feeHistory.lpYTotal0 + feeHistory.lpDTotal0) > 0n
                ? `${formatUnits(feeHistory.lpYTotal0 + feeHistory.lpDTotal0, 6)} USDC`
                : '',
              (feeHistory.lpYTotal1 + feeHistory.lpDTotal1) > 0n
                ? `${formatUnits(feeHistory.lpYTotal1 + feeHistory.lpDTotal1, 6)} PRISM`
                : '',
            ].filter(Boolean).join(' + ') || '--'}
            highlight
            span2
          />
        )}
      </div>

      {/* Claim + Transfer actions */}
      {ADDRESSES.PrismHook && (
        <div className="px-5 pb-5">
          <ClaimPanel
            posId={posId}
            ilComp={ilComp ?? 0n}
            lpdClaimable={lpdClaimable ?? 0n}
            lpDFees={lpDFees ? { amount0: lpDFees[0], amount1: lpDFees[1] } : { amount0: 0n, amount1: 0n }}
            feeHistory={feeHistory}
            settled={settled}
            lpDHolder={lpDHolder}
            account={account}
            tickLower={tickLower}
            tickUpper={tickUpper}
            liquidity={BigInt(liquidity)}
          />
          {(isLPYHolder || isLPDHolder) && (
            <TransferPanel
              posId={posId}
              account={account}
              lpYBal={lpYBal ?? 0n}
              lpDBal={lpDBal ?? 0n}
            />
          )}
        </div>
      )}
    </div>
  )
}

function TokenPill({ label, color }: { label: string; color: 'emerald' | 'violet' | 'neutral' }) {
  const cls = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    violet:  'bg-violet-500/10  border-violet-500/20  text-violet-400',
    neutral: 'bg-white/[0.04]   border-white/[0.08]   text-white/30',
  }[color]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {label}
    </span>
  )
}

function StatusChip({ label, color, pulse }: { label: string; color: 'emerald' | 'amber' | 'neutral'; pulse?: boolean }) {
  const cls = {
    emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber:   'bg-amber-500/5   border-amber-500/20   text-amber-400',
    neutral: 'bg-white/[0.04] border-white/[0.06]   text-white/30',
  }[color]
  const dotCls = {
    emerald: 'bg-emerald-400',
    amber:   'bg-amber-400',
    neutral: 'bg-white/30',
  }[color]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCls} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}

function StatCell({ label, value, mono, dim, highlight, extra, span2 }: {
  label: string; value: string; mono?: boolean; dim?: boolean; highlight?: boolean; extra?: React.ReactNode; span2?: boolean
}) {
  return (
    <div className={`bg-zinc-950/40 px-5 py-4 ${span2 ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} ${dim ? 'text-white/25' : highlight ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </p>
      {extra}
    </div>
  )
}
