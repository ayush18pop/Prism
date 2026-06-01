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
  const hasLPDFees = lpDFees.amount0 > 0n || lpDFees.amount1 > 0n

  async function claimIL() {
    setLoading('il'); setError('')
    try {
      const tx = await write({ address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'claimILCompensation', args: [posId], chainId: 1301 })
      await client?.waitForTransactionReceipt({ hash: tx })
    } catch (e: unknown) { setError((e as {shortMessage?: string; message: string}).shortMessage ?? (e as Error).message) }
    finally { setLoading(null) }
  }

  async function claimLPD() {
    setLoading('lpd'); setError('')
    try {
      const tx = await write({ address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'claimLPDCollateral', args: [posId], chainId: 1301 })
      await client?.waitForTransactionReceipt({ hash: tx })
    } catch (e: unknown) { setError((e as {shortMessage?: string; message: string}).shortMessage ?? (e as Error).message) }
    finally { setLoading(null) }
  }

  async function settle() {
    setLoading('settle'); setError('')
    try {
      const tx = await write({ address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'settleLPD', args: [posId], chainId: 1301 })
      await client?.waitForTransactionReceipt({ hash: tx })
    } catch (e: unknown) { setError((e as {shortMessage?: string; message: string}).shortMessage ?? (e as Error).message) }
    finally { setLoading(null) }
  }

  async function claimFeesLPD() {
    setLoading('fees'); setError('')
    try {
      const tx = await write({ address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'claimFeesLPD', args: [poolKey, posId], chainId: 1301 })
      await client?.waitForTransactionReceipt({ hash: tx })
    } catch (e: unknown) { setError((e as {shortMessage?: string; message: string}).shortMessage ?? (e as Error).message) }
    finally { setLoading(null) }
  }

  if (ilComp === 0n && lpdClaimable === 0n && !hasLPDFees && !isLPDHolder) return null

  return (
    <div className="space-y-2 border-t border-zinc-800 pt-3">
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {ilComp > 0n && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-950/30 border border-emerald-900/40 px-3 py-2">
          <div>
            <p className="text-xs text-emerald-400 font-medium">IL Compensation Ready</p>
            <p className="text-xs text-zinc-400">{formatUnits(ilComp, 6)} USDC</p>
          </div>
          <Button size="sm" onClick={claimIL} loading={loading === 'il'} className="bg-emerald-700 hover:bg-emerald-600">
            Claim
          </Button>
        </div>
      )}

      {isLPDHolder && !settled && lpdClaimable === 0n && (
        <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 border border-zinc-700 px-3 py-2">
          <p className="text-xs text-zinc-400">You hold LP-D — settle to unlock collateral</p>
          <Button size="sm" variant="secondary" onClick={settle} loading={loading === 'settle'}>
            Settle
          </Button>
        </div>
      )}

      {isLPDHolder && lpdClaimable > 0n && (
        <div className="flex items-center justify-between rounded-lg bg-violet-950/30 border border-violet-900/40 px-3 py-2">
          <div>
            <p className="text-xs text-violet-400 font-medium">LP-D Collateral Claimable</p>
            <p className="text-xs text-zinc-400">{formatUnits(lpdClaimable, 6)} USDC</p>
          </div>
          <Button size="sm" onClick={claimLPD} loading={loading === 'lpd'} className="bg-violet-700 hover:bg-violet-600">
            Claim
          </Button>
        </div>
      )}

      {isLPDHolder && hasLPDFees && (
        <div className="flex items-center justify-between rounded-lg bg-amber-950/30 border border-amber-900/40 px-3 py-2">
          <div>
            <p className="text-xs text-amber-400 font-medium">LP-D Fee Share Ready</p>
            <p className="text-xs text-zinc-400">
              {lpDFees.amount0 > 0n && <span>{formatUnits(lpDFees.amount0, 18)} token0</span>}
              {lpDFees.amount0 > 0n && lpDFees.amount1 > 0n && <span> · </span>}
              {lpDFees.amount1 > 0n && <span>{formatUnits(lpDFees.amount1, 18)} token1</span>}
            </p>
          </div>
          <Button size="sm" onClick={claimFeesLPD} loading={loading === 'fees'} className="bg-amber-700 hover:bg-amber-600">
            Claim Fees
          </Button>
        </div>
      )}
    </div>
  )
}
