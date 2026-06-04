'use client'

import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import { useWriteContract, usePublicClient, useReadContract, useAccount } from 'wagmi'
import { toast } from 'sonner'
import { ADDRESSES, DEMO_POOL_KEY } from '@/lib/addresses'
import { PRISM_ROUTER_ABI, ERC20_ABI } from '@/lib/abis'

const BLOCKSCOUT   = 'https://unichain-sepolia.blockscout.com/tx/'
const MIN_SQRT_PRICE_LIMIT = 4295128739n + 1n
const MAX_SQRT_PRICE_LIMIT = 1461446703485210103287273052203988822378723970342n - 1n

export function SwapForm() {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: 1301 })
  const { writeContractAsync: write } = useWriteContract()

  const [zeroForOne, setZeroForOne] = useState(true)
  const [amount,     setAmount]     = useState('10')
  const [step,       setStep]       = useState<'idle' | 'approving' | 'swapping' | 'done'>('idle')
  const [lastTx,     setLastTx]     = useState<`0x${string}` | null>(null)
  const [amountHovered, setAmountHovered] = useState(false)

  const tokenIn      = zeroForOne ? 'USDC'  : 'PRISM'
  const tokenOut     = zeroForOne ? 'PRISM' : 'USDC'
  const tokenInAddr  = zeroForOne ? ADDRESSES.USDC  : ADDRESSES.PRISM
  const decimalsIn   = 6
  const decimalsDisplay = zeroForOne ? 2 : 4

  const { data: balance } = useReadContract({
    address: tokenInAddr,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 1301,
    query: { enabled: !!address && !!tokenInAddr },
  })

  const balanceFormatted = balance != null
    ? parseFloat(formatUnits(balance, decimalsIn)).toFixed(decimalsDisplay)
    : null

  const isLoading = step === 'approving' || step === 'swapping'

  async function submit() {
    if (!ADDRESSES.PrismRouter || !tokenInAddr) return
    setStep('approving')
    try {
      const amountIn = parseUnits(amount, decimalsIn)
      const approveTx = await write({
        address: tokenInAddr, abi: ERC20_ABI, functionName: 'approve',
        args: [ADDRESSES.PrismRouter, amountIn], chainId: 1301,
      })
      const approveReceipt = await client?.waitForTransactionReceipt({ hash: approveTx })
      if (approveReceipt?.status === 'reverted') throw new Error('Approve transaction reverted')
      setStep('swapping')
      const swapTx = await write({
        address: ADDRESSES.PrismRouter, abi: PRISM_ROUTER_ABI, functionName: 'swap',
        args: [DEMO_POOL_KEY, zeroForOne, -parseUnits(amount, decimalsIn), zeroForOne ? MIN_SQRT_PRICE_LIMIT : MAX_SQRT_PRICE_LIMIT],
        chainId: 1301,
      })
      const swapReceipt = await client?.waitForTransactionReceipt({ hash: swapTx })
      if (swapReceipt?.status === 'reverted') throw new Error('Swap transaction reverted')
      setLastTx(swapTx)
      setStep('done')
      toast.success(`Swapped ${amount} ${tokenIn} → ${tokenOut}`, {
        action: { label: 'View ↗', onClick: () => window.open(BLOCKSCOUT + swapTx, '_blank') },
      })
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      toast.error('Swap failed', { description: msg.slice(0, 120) })
      setStep('idle')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Token direction */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Sell</div>
          <div style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 15, color: 'var(--text-primary)' }}>{tokenIn}</div>
        </div>
        <button
          onClick={() => { setZeroForOne(p => !p); setStep('idle'); setLastTx(null) }}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            transition: 'border-color 150ms, color 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
          title="Flip direction"
        >
          {/* Swap arrows SVG — no lucide dependency */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 5L5 2L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 2V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 9L9 12L12 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Buy</div>
          <div style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 15, color: 'var(--text-primary)' }}>{tokenOut}</div>
        </div>
      </div>

      {/* Amount */}
      <div
        onMouseEnter={() => setAmountHovered(true)}
        onMouseLeave={() => setAmountHovered(false)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, height: 18 }}>
          <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            AMOUNT ({tokenIn})
          </label>

          {/* Percentage pills — fade in on hover */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            opacity: amountHovered && balance ? 1 : 0,
            transform: amountHovered && balance ? 'translateY(0)' : 'translateY(3px)',
            transition: 'opacity 160ms ease, transform 160ms ease',
            pointerEvents: amountHovered && balance ? 'auto' : 'none',
          }}>
            {([25, 50, 75] as const).map(pct => (
              <button
                key={pct}
                onClick={() => {
                  if (!balance) return
                  const val = (balance * BigInt(pct)) / 100n
                  setAmount(parseFloat(formatUnits(val, decimalsIn)).toFixed(decimalsDisplay))
                  setStep('idle')
                }}
                style={{
                  padding: '2px 7px', fontSize: 11, fontWeight: 500,
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                  background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  transition: 'color 100ms, border-color 100ms',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.borderColor = 'var(--text-tertiary)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-secondary)'; el.style.borderColor = 'var(--border-strong)' }}
              >
                {pct}%
              </button>
            ))}
            <button
              onClick={() => {
                if (!balance) return
                setAmount(parseFloat(formatUnits(balance, decimalsIn)).toFixed(decimalsDisplay))
                setStep('idle')
              }}
              style={{
                padding: '2px 7px', fontSize: 11, fontWeight: 500,
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)', cursor: 'pointer',
                transition: 'color 100ms, border-color 100ms',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.borderColor = 'var(--text-tertiary)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-secondary)'; el.style.borderColor = 'var(--border-strong)' }}
            >
              Max
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', padding: '10px 12px' }}>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setStep('idle') }}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 18,
              color: 'var(--text-primary)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
            {/* Balance — fades out when pills are visible */}
            {balanceFormatted != null && (
              <span style={{
                fontSize: 11, color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                opacity: amountHovered ? 0 : 1,
                transition: 'opacity 160ms ease',
              }}>
                {balanceFormatted}
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12, color: 'var(--text-secondary)' }}>
              {tokenIn}
            </span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 12 }}>
        {['0.5% slippage', 'Fee 0.05%'].map(s => (
          <span key={s} style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>{s}</span>
        ))}
      </div>

      {/* Done state — tx link */}
      {step === 'done' && lastTx && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--positive-muted)', border: '1px solid rgba(22,163,74,0.25)' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--positive)' }}>Swap confirmed</p>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {lastTx.slice(0, 10)}…{lastTx.slice(-6)}
            </p>
          </div>
          <a href={BLOCKSCOUT + lastTx} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            View ↗
          </a>
        </div>
      )}

      {/* Step progress */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(['approving', 'swapping'] as const).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: step === s ? 'var(--vault-base)' : 'var(--border-strong)',
                animation: step === s ? 'live-pulse 1s ease-in-out infinite' : 'none',
              }} />
              {i < 1 && <div style={{ width: 16, height: 1, background: 'var(--border-subtle)' }} />}
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>
            {step === 'approving' ? `Approving ${tokenIn}…` : `Swapping…`}
          </span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={step === 'done' ? () => { setStep('idle'); setLastTx(null) } : submit}
        disabled={isLoading || !ADDRESSES.PrismRouter}
        style={{
          width: '100%', padding: '12px',
          background: (!isLoading && step !== 'done') ? 'var(--text-primary)' : 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          color: (!isLoading && step !== 'done') ? 'var(--bg-base)' : 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500,
          cursor: (isLoading || !ADDRESSES.PrismRouter) ? 'not-allowed' : 'pointer',
          transition: 'background 150ms, color 150ms',
          opacity: !ADDRESSES.PrismRouter ? 0.4 : 1,
        }}
      >
        {step === 'approving' ? `Approving ${tokenIn}…`
          : step === 'swapping' ? 'Swapping…'
          : step === 'done'    ? 'Swap Again'
          : `Swap ${tokenIn} → ${tokenOut}`}
      </button>
    </div>
  )
}
