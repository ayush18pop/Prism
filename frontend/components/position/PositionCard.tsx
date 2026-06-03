'use client'

import { formatUnits } from 'viem'
import { useReadContract } from 'wagmi'
import { ILStatusBadge } from './ILStatusBadge'
import { ClaimPanel } from './ClaimPanel'
import { usePosition, useVault, useILCompensation, useLPDClaimable, useLPDFeesClaimable } from '@/hooks/usePrismHook'
import { ADDRESSES } from '@/lib/addresses'
import { ERC1155_ABI } from '@/lib/abis'

interface PositionCardProps {
  posId: `0x${string}`
  currentSqrtPrice: bigint
  account: `0x${string}`
}

export function PositionCard({ posId, currentSqrtPrice, account }: PositionCardProps) {
  const { data: pos }          = usePosition(posId)
  const { data: vault }        = useVault(posId)
  const { data: ilComp }       = useILCompensation(posId)
  const { data: lpdClaimable } = useLPDClaimable(posId)
  const { data: lpDFees }      = useLPDFeesClaimable(posId)

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

  const { settled, lpDSold, tickLower, tickUpper, lpDHolder } = pos

  const lpDDisplay = lpDBal != null
    ? lpDBal > 0n ? lpDBal.toString() : lpDSold ? 'sold' : '—'
    : '—'

  // Determine badge glow color for the hero row
  const ilFrac = (pos.entrySqrtPrice > 0n && currentSqrtPrice > 0n)
    ? (currentSqrtPrice >= pos.entrySqrtPrice ? 0 : -0.05) // rough sign for glow color
    : null
  const badgeGlow = settled
    ? ''
    : lpDSold
      ? 'shadow-[0_0_32px_rgba(16,185,129,0.15)]'
      : ilFrac !== null && ilFrac >= 0
        ? 'shadow-[0_0_32px_rgba(16,185,129,0.12)]'
        : 'shadow-[0_0_32px_rgba(245,158,11,0.12)]'

  return (
    <div className={`liquid-glass rounded-2xl p-5 transition-opacity ${settled ? 'opacity-50' : ''}`}>

      {/* Header: posId */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-[0.2em] mb-1">Position</p>
          <p className="font-mono text-xs text-white/40">{posId.slice(0, 10)}&hellip;{posId.slice(-6)}</p>
        </div>
        {settled && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-white/30 border border-white/[0.08]">
            Settled
          </span>
        )}
      </div>

      {/* IL badge — hero row */}
      {!settled && currentSqrtPrice > 0n && pos.entrySqrtPrice > 0n && (
        <div className={`flex justify-center py-4 border-b border-white/5 mb-4 ${badgeGlow}`}>
          <ILStatusBadge
            entrySqrtPrice={pos.entrySqrtPrice}
            currentSqrtPrice={currentSqrtPrice}
            lpDSold={lpDSold}
            size="lg"
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
        <Stat label="Tick Range" value={`[${tickLower}, ${tickUpper}]`} />
        <Stat label="Collateral Vault" value={vault != null ? `${formatUnits(vault, 6)} USDC` : '—'} />
        <Stat label="LP-Y Balance" value={lpYBal != null ? lpYBal.toString() : '—'} mono />
        <Stat label="LP-D" value={lpDDisplay} mono dim={lpDDisplay === 'sold'} />
      </div>

      {/* ClaimPanel only renders when contracts are deployed — addresses guard inside */}
      {ADDRESSES.LPYToken && ADDRESSES.LPDToken && ADDRESSES.PrismHook && (
        <ClaimPanel
          posId={posId}
          poolKey={{
            currency0: ADDRESSES.LPYToken,
            currency1: ADDRESSES.LPDToken,
            fee: 3000,
            tickSpacing: 60,
            hooks: ADDRESSES.PrismHook,
          }}
          ilComp={ilComp ?? 0n}
          lpdClaimable={lpdClaimable ?? 0n}
          lpDFees={lpDFees ? { amount0: lpDFees[0], amount1: lpDFees[1] } : { amount0: 0n, amount1: 0n }}
          settled={settled}
          lpDHolder={lpDHolder}
          account={account}
        />
      )}
    </div>
  )
}

function Stat({ label, value, mono, dim }: { label: string; value: string; mono?: boolean; dim?: boolean }) {
  return (
    <div>
      <p className="text-xs text-white/50 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} ${dim ? 'text-white/30 italic' : 'text-white'}`}>{value}</p>
    </div>
  )
}
