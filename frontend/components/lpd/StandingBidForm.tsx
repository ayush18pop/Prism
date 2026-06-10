'use client'

import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { useWriteContract, usePublicClient, useAccount, useReadContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI, ERC20_ABI } from '@/lib/abis'
import { SectionLabel } from '@/components/ui/index'

const BLOCKSCOUT = 'https://unichain-sepolia.blockscout.com/tx/'

interface StandingBidFormProps {
  poolId: `0x${string}` | undefined
}

export function StandingBidForm({ poolId }: StandingBidFormProps) {
  const { address } = useAccount()
  const client      = usePublicClient({ chainId: 1301 })
  const queryClient = useQueryClient()

  const { data: usdcBal } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 1301,
    query: { enabled: !!address && !!ADDRESSES.USDC },
  })

  const [coverage,    setCoverage]    = useState('0.5')
  const [feeSharePct, setFeeSharePct] = useState('30')
  const [maxUsdc,     setMaxUsdc]     = useState('10000')
  const [error,       setError]       = useState('')
  const [step,        setStep]        = useState<'idle' | 'approving' | 'setting'>('idle')

  const { writeContractAsync: write } = useWriteContract()

  async function submit() {
    if (!poolId || !address) return
    if (!ADDRESSES.USDC || !ADDRESSES.PrismHook) {
      setError('Contracts not yet deployed. Fill addresses.ts after running Deploy.s.sol')
      return
    }
    if (!client) { setError('No RPC client, check chain connection'); return }
    setError('')
    try {
      setStep('approving')
      const usdcAmount   = parseUnits(maxUsdc, 6)
      const approveTx    = await write({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.PrismHook, usdcAmount], chainId: 1301 })
      const approveReceipt = await client.waitForTransactionReceipt({ hash: approveTx })
      if (approveReceipt.status === 'reverted') throw new Error('Approve reverted on-chain')

      setStep('setting')
      const pricePerUnit  = BigInt(Math.floor(parseFloat(coverage) * 1e18))
      const feeShareBps   = BigInt(Math.min(10000, Math.round(parseFloat(feeSharePct) * 100)))
      const ilCoverageBps = BigInt(Math.min(10000, Math.round(parseFloat(coverage) * 10000)))
      const postTx = await write({ address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'postBid', args: [poolId, pricePerUnit, feeShareBps, ilCoverageBps, usdcAmount], chainId: 1301 })
      const postReceipt = await client.waitForTransactionReceipt({ hash: postTx })
      if (postReceipt.status === 'reverted') throw new Error('postBid reverted on-chain')
      setStep('idle')
      queryClient.invalidateQueries({ queryKey: ['bid', ADDRESSES.PrismHook, poolId] })
      toast.success('Bid posted', {
        description: `${(parseFloat(coverage) * 100).toFixed(0)}% IL coverage · ${maxUsdc} USDC budget`,
        action: { label: 'View ↗', onClick: () => window.open(BLOCKSCOUT + postTx, '_blank') },
      })
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      setError(msg)
      toast.error('Failed to set bid', { description: msg.slice(0, 120) })
      setStep('idle')
    }
  }

  const coverageNum  = parseFloat(coverage) || 0
  const maxUsdcNum   = parseFloat(maxUsdc)  || 0
  const feeNum       = parseFloat(feeSharePct) || 0
  const feeInvalid   = feeNum > 100
  const isLoading    = step === 'approving' || step === 'setting'

  const btnLabel = step === 'approving' ? 'Approving USDC…'
                 : step === 'setting'   ? 'Posting bid…'
                 : `Post Bid · ${maxUsdcNum.toLocaleString()} USDC`

  if (!ADDRESSES.PrismHook) {
    return (
      <div style={{ padding: '12px 16px', background: 'var(--warning-muted)', border: '1px solid rgba(217,119,6,0.3)' }}>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--warning)', marginBottom: 4 }}>
          Contracts Not Deployed
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Run <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>forge script script/Deploy.s.sol</span> on Unichain Sepolia,
          then fill <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>lib/addresses.ts</span>.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Field 1: IL Coverage */}
      <BidField
        label="IL COVERAGE"
        hint="1.0 = full coverage"
        value={coverage}
        onChange={setCoverage}
        type="number" min={0} max={1} step={0.05}
        helper={`Fills positions where maxIL ≤ ${coverageNum.toFixed(2)}. A coverage of ${coverageNum.toFixed(2)} means you absorb up to ${(coverageNum * 100).toFixed(0)}% IL loss.`}
        accentColor="var(--vault-base)"
      />

      {/* Field 2: LP-D Fee Share */}
      <BidField
        label="LP-D FEE SHARE"
        hint="fee % you earn per swap"
        value={feeSharePct}
        onChange={setFeeSharePct}
        type="number" min={0} max={100} step={1}
        helper={`You earn ${feeNum.toFixed(0)}% of swap fees. LP-Y holders earn the remaining ${(100 - feeNum).toFixed(0)}%.`}
        suffix="%"
        accentColor="var(--lpy-base)"
      />
      {feeInvalid && (
        <span style={{ fontSize: 11, color: 'var(--warning)', marginTop: -8 }}>LP-D Fee Share cannot exceed 100%</span>
      )}

      {/* Field 3: Max Collateral */}
      <BidField
        label="MAX COLLATERAL (USDC)"
        hint="total USDC to pre-deposit"
        value={maxUsdc}
        onChange={setMaxUsdc}
        type="number" min={0}
        helper="Pre-deposited now. Used proportionally across deposits. Cancel at any time to reclaim unused amount."
        suffix="USDC"
        accentColor="var(--vault-base)"
      />

      {/* Bid preview (shows once all fields have values) */}
      {coverageNum > 0 && maxUsdcNum > 0 && feeNum >= 0 && (
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)', padding: 16 }}>
          <SectionLabel label="BID PREVIEW" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Est. per fill', value: `~${(coverageNum * maxUsdcNum * 0.1).toFixed(0)} USDC` },
              { label: 'LP-D fee share', value: `${feeNum.toFixed(0)}%` },
              { label: 'Max collateral', value: `${maxUsdcNum.toLocaleString()} USDC` },
              { label: 'Capital at risk', value: `${maxUsdcNum.toLocaleString()} USDC` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 15, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12, lineHeight: 1.5 }}>
            Estimates based on recent pool volume. This is a market position: you absorb IL risk in exchange for fee income.
          </p>
        </div>
      )}

      {/* USDC balance */}
      {usdcBal != null && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>
          Wallet USDC: {parseFloat(formatUnits(usdcBal, 6)).toFixed(2)}
        </p>
      )}

      {error && (
        <p style={{ fontSize: 11, color: 'var(--negative)', padding: '8px 12px', background: 'var(--negative-muted)', border: '1px solid rgba(220,38,38,0.2)' }}>
          {error}
        </p>
      )}

      {/* Step progress */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(['approving', 'setting'] as const).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: step === s ? 'var(--vault-base)' : 'var(--border-strong)',
                animation: step === s ? 'live-pulse 1s ease-in-out infinite' : 'none',
              }} />
              {i < 1 && <div style={{ width: 16, height: 1, background: 'var(--border-subtle)' }} />}
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>{btnLabel}</span>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={submit}
        disabled={isLoading || !ADDRESSES.PrismHook || !ADDRESSES.USDC || feeInvalid}
        style={{
          width: '100%', padding: '12px',
          background: (!isLoading && !feeInvalid) ? 'var(--text-primary)' : 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          color: (!isLoading && !feeInvalid) ? 'var(--bg-base)' : 'var(--text-tertiary)',
          fontSize: 13, fontWeight: 500,
          cursor: (isLoading || feeInvalid) ? 'not-allowed' : 'pointer',
          transition: 'background 150ms, color 150ms',
        }}
      >
        {btnLabel}
      </button>
    </div>
  )
}

function BidField({
  label, hint, value, onChange, helper, suffix, accentColor, ...inputProps
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  helper?: string
  suffix?: string
  accentColor?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          {label}
        </label>
        {hint && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>{hint}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-raised)',
        border: `1px solid ${focused ? (accentColor ?? 'var(--border-strong)') : 'var(--border-default)'}`,
        padding: '10px 12px',
        transition: 'border-color 150ms',
      }}>
        <input
          {...inputProps}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 16,
            color: 'var(--text-primary)',
          }}
        />
        {suffix && (
          <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
            {suffix}
          </span>
        )}
      </div>
      {helper && (
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{helper}</span>
      )}
    </div>
  )
}
