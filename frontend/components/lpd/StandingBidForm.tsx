'use client'

import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { useWriteContract, usePublicClient, useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI, ERC20_ABI } from '@/lib/abis'
import { useStandingBid } from '@/hooks/usePrismHook'

interface StandingBidFormProps {
  poolId: `0x${string}` | undefined
}

export function StandingBidForm({ poolId }: StandingBidFormProps) {
  const { address } = useAccount()
  const client      = usePublicClient({ chainId: 1301 })
  const { data: bid, refetch } = useStandingBid(poolId)

  const [coverage,    setCoverage]    = useState('0.5')
  const [feeSharePct, setFeeSharePct] = useState('30')
  const [maxUsdc,     setMaxUsdc]     = useState('10000')
  const [error,       setError]       = useState('')
  const [step, setStep] = useState<'idle' | 'approving' | 'setting' | 'done'>('idle')

  const { writeContractAsync: write } = useWriteContract()

  async function submit() {
    if (!poolId || !address) return
    if (!ADDRESSES.USDC || !ADDRESSES.PrismHook) {
      setError('Contracts not yet deployed — fill addresses.ts after running Deploy.s.sol')
      return
    }
    setError('')
    try {
      setStep('approving')
      const usdcAmount   = parseUnits(maxUsdc, 6)
      const approveTx    = await write({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.PrismHook, usdcAmount], chainId: 1301 })
      await client?.waitForTransactionReceipt({ hash: approveTx })

      setStep('setting')
      const pricePerUnit = BigInt(Math.floor(parseFloat(coverage) * 1e18))
      const feeShareBps  = BigInt(Math.min(10000, Math.round(parseFloat(feeSharePct) * 100)))
      const setBidTx     = await write({ address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'setStandingBid', args: [poolId, pricePerUnit, feeShareBps, usdcAmount], chainId: 1301 })
      await client?.waitForTransactionReceipt({ hash: setBidTx })
      setStep('done')
      refetch()
    } catch (e: unknown) {
      setError((e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message)
      setStep('idle')
    }
  }

  async function cancel() {
    if (!poolId || !ADDRESSES.PrismHook) return
    setError('')
    try {
      const tx = await write({ address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'cancelStandingBid', args: [poolId], chainId: 1301 })
      await client?.waitForTransactionReceipt({ hash: tx })
      refetch()
    } catch (e: unknown) {
      setError((e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message)
    }
  }

  const isLoading = step === 'approving' || step === 'setting'

  const btnLabel = step === 'approving' ? 'Approving USDC...'
                 : step === 'setting'   ? 'Setting Bid...'
                 : step === 'done'      ? 'Bid Active'
                 : 'Set Standing Bid'

  // Contracts not yet deployed — show placeholder instead of live form
  if (!ADDRESSES.PrismHook) {
    return (
      <div className="liquid-glass rounded-2xl p-5">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-1">Contracts Not Deployed</p>
          <p className="text-xs text-white/40">
            Run <span className="font-mono text-white/60">forge script script/Deploy.s.sol</span> on Unichain Sepolia,
            then fill <span className="font-mono text-white/60">lib/addresses.ts</span> with the output addresses.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="liquid-glass rounded-2xl p-5">

      {/* Active bid display */}
      {bid?.active && (
        <div className="mb-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Active Standing Bid</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-[0.2em] mb-0.5">Coverage</p>
              <p className="text-sm font-mono text-white">{(Number(bid.pricePerUnit) / 1e18 * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-[0.2em] mb-0.5">LP-D Fee Share</p>
              <p className="text-sm font-mono text-white">{(Number(bid.feeShareBpsLPD) / 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-[0.2em] mb-0.5">Collateral Used</p>
              <p className="text-sm font-mono text-white">
                {formatUnits(bid.usedCollateral, 6)} <span className="text-white/60">/ {formatUnits(bid.maxCollateral, 6)} USDC</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <FormField
          label="IL Coverage"
          hint="1.0 = 100% coverage"
          type="number" min={0} max={1} step={0.01}
          value={coverage}
          onChange={setCoverage}
        />
        <FormField
          label="LP-D Fee Share (%)"
          hint="Fee % the LP-D holder earns"
          type="number" min={0} max={100} step={1}
          value={feeSharePct}
          onChange={setFeeSharePct}
        />
        <FormField
          label="Max Collateral (USDC)"
          hint="Total USDC to pre-deposit"
          type="number" min={0}
          value={maxUsdc}
          onChange={setMaxUsdc}
        />

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {/* Coverage ring — visual feedback between fields and submit */}
        <CoverageRing value={parseFloat(coverage) || 0} />

        <div className="flex gap-2 pt-1">
          <Button onClick={submit} loading={isLoading} disabled={step === 'done' || !ADDRESSES.PrismHook || !ADDRESSES.USDC} className="flex-1">
            {btnLabel}
          </Button>
          {bid?.active && (
            <Button variant="secondary" onClick={cancel}>
              Cancel Bid
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function FormField({
  label, hint, value, onChange, ...inputProps
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs text-white/60 uppercase tracking-[0.2em]">{label}</label>
        {hint && <span className="text-xs text-white/50">{hint}</span>}
      </div>
      <input
        {...inputProps}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
      />
    </div>
  )
}

function CoverageRing({ value }: { value: number }) {
  const pct = Math.min(1, Math.max(0, value))
  const r = 28
  const circ = 2 * Math.PI * r
  const strokeColor = pct >= 0.8 ? '#10b981' : pct >= 0.4 ? '#8b5cf6' : '#f59e0b'
  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={strokeColor}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
        />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="13" fontFamily="monospace">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <p className="text-xs text-white/40">IL coverage</p>
    </div>
  )
}
