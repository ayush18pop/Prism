'use client'

import { formatUnits } from 'viem'
import { useWriteContract, usePublicClient } from 'wagmi'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI } from '@/lib/abis'

interface PoolKeyType {
  currency0: `0x${string}`
  currency1: `0x${string}`
  fee: number
  tickSpacing: number
  hooks: `0x${string}`
}

interface ClaimPanelProps {
  posId: `0x${string}`
  poolKey: PoolKeyType
  ilComp: bigint
  lpdClaimable: bigint
  lpDFees: { amount0: bigint; amount1: bigint }
  settled: boolean
  lpDHolder: `0x${string}`
  account: `0x${string}`
}

export function ClaimPanel({ posId, poolKey, ilComp, lpdClaimable, lpDFees, settled, lpDHolder, account }: ClaimPanelProps) {
  const client = usePublicClient({ chainId: 1301 })
  const { writeContractAsync: write } = useWriteContract()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isLPDHolder = lpDHolder.toLowerCase() === account.toLowerCase()
  const hasLPDFees  = lpDFees.amount0 > 0n || lpDFees.amount1 > 0n

  // Contracts not deployed — no actions possible
  if (!ADDRESSES.PrismHook) return null
  if (ilComp === 0n && lpdClaimable === 0n && !hasLPDFees && !isLPDHolder) return null

  // Safe to use after the guard above
  const hookAddress = ADDRESSES.PrismHook

  async function exec(key: string, fn: () => Promise<`0x${string}`>) {
    setLoading(key); setError('')
    try {
      const tx = await fn()
      await client?.waitForTransactionReceipt({ hash: tx })
    } catch (e: unknown) {
      setError((e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message)
    } finally { setLoading(null) }
  }

  return (
    <div className="space-y-2 border-t border-white/8 pt-4">
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {ilComp > 0n && (
        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">IL Compensation Ready</p>
            <p className="text-sm font-mono text-white mt-0.5">{formatUnits(ilComp, 6)} USDC</p>
          </div>
          <Button
            size="sm"
            loading={loading === 'il'}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => exec('il', () => write({ address: hookAddress, abi: PRISM_HOOK_ABI, functionName: 'claimILCompensation', args: [posId], chainId: 1301 }))}
          >
            Claim
          </Button>
        </div>
      )}

      {isLPDHolder && !settled && lpdClaimable === 0n && (
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3">
          <p className="text-xs text-white/60">You hold LP-D &mdash; settle to unlock collateral</p>
          <Button
            size="sm"
            variant="secondary"
            loading={loading === 'settle'}
            onClick={() => exec('settle', () => write({ address: hookAddress, abi: PRISM_HOOK_ABI, functionName: 'settleLPD', args: [posId], chainId: 1301 }))}
          >
            Settle
          </Button>
        </div>
      )}

      {isLPDHolder && lpdClaimable > 0n && (
        <div className="flex items-center justify-between bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-violet-400 font-medium uppercase tracking-wide">LP-D Collateral</p>
            <p className="text-sm font-mono text-white mt-0.5">{formatUnits(lpdClaimable, 6)} USDC</p>
          </div>
          <Button
            size="sm"
            loading={loading === 'lpd'}
            className="bg-violet-600 hover:bg-violet-500 text-white"
            onClick={() => exec('lpd', () => write({ address: hookAddress, abi: PRISM_HOOK_ABI, functionName: 'claimLPDCollateral', args: [posId], chainId: 1301 }))}
          >
            Claim
          </Button>
        </div>
      )}

      {isLPDHolder && hasLPDFees && (
        <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-amber-400 font-medium uppercase tracking-wide">LP-D Fee Share</p>
            <p className="text-xs text-white/40 mt-0.5">
              {lpDFees.amount0 > 0n && <span>{formatUnits(lpDFees.amount0, 18)} token0</span>}
              {lpDFees.amount0 > 0n && lpDFees.amount1 > 0n && ' · '}
              {lpDFees.amount1 > 0n && <span>{formatUnits(lpDFees.amount1, 18)} token1</span>}
            </p>
          </div>
          <Button
            size="sm"
            loading={loading === 'fees'}
            className="bg-amber-600 hover:bg-amber-500 text-white"
            onClick={() => exec('fees', () => write({ address: hookAddress, abi: PRISM_HOOK_ABI, functionName: 'claimFeesLPD', args: [poolKey, posId], chainId: 1301 }))}
          >
            Claim Fees
          </Button>
        </div>
      )}
    </div>
  )
}
