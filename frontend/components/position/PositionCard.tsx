'use client'

import { formatUnits } from 'viem'
import { useReadContract } from 'wagmi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
  const { data: pos }           = usePosition(posId)
  const { data: vault }         = useVault(posId)
  const { data: ilComp }        = useILCompensation(posId)
  const { data: lpdClaimable }  = useLPDClaimable(posId)
  const { data: lpDFees }       = useLPDFeesClaimable(posId)

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

  const settled = pos.settled
  const lpDSold = pos.lpDSold

  return (
    <Card className={settled ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Position</CardTitle>
          <div className="flex items-center gap-2">
            {settled ? (
              <span className="text-xs text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">Settled</span>
            ) : (
              currentSqrtPrice > 0n && pos.entrySqrtPrice > 0n && (
                <ILStatusBadge
                  entrySqrtPrice={pos.entrySqrtPrice}
                  currentSqrtPrice={currentSqrtPrice}
                />
              )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <Kv k="posId" v={`${posId.slice(0, 10)}…`} mono />
          <Kv k="LP-D sold?" v={lpDSold ? 'Yes' : 'No'} />
          <Kv k="Tick range" v={`[${pos.tickLower}, ${pos.tickUpper}]`} />
          <Kv k="Collateral vault" v={vault != null ? `${formatUnits(vault, 6)} USDC` : '—'} />
          <Kv k="LP-Y balance" v={lpYBal != null ? lpYBal.toString() : '—'} />
          <Kv k="LP-D balance" v={lpDBal != null ? lpDBal.toString() : '—'} />
        </div>

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
          lpDHolder={pos.lpDHolder}
          account={account}
        />
      </CardContent>
    </Card>
  )
}

function Kv({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-zinc-500">{k}: </span>
      <span className={mono ? 'font-mono text-zinc-300' : 'text-zinc-300'}>{v}</span>
    </div>
  )
}
