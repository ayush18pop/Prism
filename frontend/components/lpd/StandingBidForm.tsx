'use client'

import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { useWriteContract, usePublicClient, useAccount } from 'wagmi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI, ERC20_ABI } from '@/lib/abis'
import { useStandingBid } from '@/hooks/usePrismHook'

interface StandingBidFormProps {
  poolId: `0x${string}` | undefined
}

export function StandingBidForm({ poolId }: StandingBidFormProps) {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: 1301 })
  const { data: bid, refetch } = useStandingBid(poolId)

  const [coverage, setCoverage] = useState('0.5')     // WAD fraction e.g. 0.5 = 50%
  const [feeSharePct, setFeeSharePct] = useState('30') // fee share % LP-D receives (0–100)
  const [maxUsdc, setMaxUsdc] = useState('10000')      // USDC
  const [error, setError] = useState('')
  const [step, setStep] = useState<'idle' | 'approving' | 'setting' | 'done'>('idle')

  const { writeContractAsync: write } = useWriteContract()

  async function submit() {
    if (!poolId || !address) return
    setError('')
    try {
      setStep('approving')
      const usdcAmount = parseUnits(maxUsdc, 6)
      const approveTx = await write({
        address: ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ADDRESSES.PrismHook, usdcAmount],
        chainId: 1301,
      })
      await client?.waitForTransactionReceipt({ hash: approveTx })

      setStep('setting')
      // pricePerUnit is WAD coverage fraction (1e18 = 100%)
      const pricePerUnit = BigInt(Math.floor(parseFloat(coverage) * 1e18))
      // feeShareBpsLPD: percentage input (0–100) converted to basis points (0–10000)
      const feeShareBps = BigInt(Math.min(10000, Math.round(parseFloat(feeSharePct) * 100)))
      const setBidTx = await write({
        address: ADDRESSES.PrismHook,
        abi: PRISM_HOOK_ABI,
        functionName: 'setStandingBid',
        args: [poolId, pricePerUnit, feeShareBps, usdcAmount],
        chainId: 1301,
      })
      await client?.waitForTransactionReceipt({ hash: setBidTx })
      setStep('done')
      refetch()
    } catch (e: unknown) {
      setError((e as {shortMessage?: string; message: string}).shortMessage ?? (e as Error).message)
      setStep('idle')
    }
  }

  async function cancel() {
    if (!poolId) return
    try {
      const tx = await write({
        address: ADDRESSES.PrismHook,
        abi: PRISM_HOOK_ABI,
        functionName: 'cancelStandingBid',
        args: [poolId],
        chainId: 1301,
      })
      await client?.waitForTransactionReceipt({ hash: tx })
      refetch()
    } catch (e: unknown) {
      setError((e as {shortMessage?: string; message: string}).shortMessage ?? (e as Error).message)
    }
  }

  const isLoading = step === 'approving' || step === 'setting'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standing Bid (Protocol)</CardTitle>
      </CardHeader>
      <CardContent>
        {bid?.active && (
          <div className="mb-4 rounded-lg bg-emerald-950/40 border border-emerald-800/50 p-3 text-xs">
            <p className="text-emerald-400 font-medium">Active bid</p>
            <p className="text-zinc-400 mt-1">
              Coverage: {(Number(bid.pricePerUnit) / 1e18 * 100).toFixed(1)}% ·
              LP-D fee share: {(Number(bid.feeShareBpsLPD) / 100).toFixed(1)}% ·
              Collateral: {formatUnits(bid.maxCollateral, 6)} USDC · Used: {formatUnits(bid.usedCollateral, 6)} USDC
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">IL Coverage (WAD fraction)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={coverage}
              onChange={e => setCoverage(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="0.5 = 50% IL coverage"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">LP-D Fee Share (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={feeSharePct}
              onChange={e => setFeeSharePct(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="30 = LP-D earns 30% of pool fees"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Max Collateral (USDC)</label>
            <input
              type="number"
              min="0"
              value={maxUsdc}
              onChange={e => setMaxUsdc(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={submit} loading={isLoading} className="flex-1">
              {step === 'approving' ? 'Approving USDC…' : step === 'setting' ? 'Setting Bid…' : step === 'done' ? 'Bid Set!' : 'Set Bid'}
            </Button>
            {bid?.active && (
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
