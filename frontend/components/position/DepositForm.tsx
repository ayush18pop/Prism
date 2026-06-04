'use client'

import { useState, useMemo } from 'react'
import { formatUnits, parseUnits, keccak256, encodePacked } from 'viem'
import { useWriteContract, usePublicClient, useReadContract, useAccount } from 'wagmi'
import { toast } from 'sonner'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_ROUTER_ABI, ERC20_ABI } from '@/lib/abis'
import { SplitVisualizer } from '@/components/ui/index'

const BLOCKSCOUT  = 'https://unichain-sepolia.blockscout.com/tx/'
const MAX_APPROVE = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const
const Q96 = 2n ** 96n

// Fee tiers — only fee=500 (0.05%) is deployed on this testnet
const FEE_TIERS = [
  { label: '0.01%', fee: 100,   tickSpacing: 1,   deployed: false },
  { label: '0.05%', fee: 500,   tickSpacing: 10,  deployed: true  },
  { label: '0.30%', fee: 3000,  tickSpacing: 60,  deployed: false },
  { label: '1.00%', fee: 10000, tickSpacing: 200, deployed: false },
] as const

const EXTSLOAD_ABI = [
  { name: 'extsload', type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'slot', type: 'bytes32' }],
    outputs: [{ name: 'value', type: 'bytes32' }] },
] as const

function poolStateSlot(poolId: `0x${string}`): `0x${string}` {
  return keccak256(encodePacked(['bytes32', 'uint256'], [poolId, 6n]))
}

function decodeSlot0(raw: `0x${string}`): { sqrtPriceX96: bigint; tick: number } {
  const v = BigInt(raw)
  const sqrtPriceX96 = v & ((1n << 160n) - 1n)
  const tickRaw = (v >> 160n) & ((1n << 24n) - 1n)
  const tick = tickRaw >= (1n << 23n) ? Number(tickRaw - (1n << 24n)) : Number(tickRaw)
  return { sqrtPriceX96, tick }
}

function getSqrtAtTick(tick: number): bigint {
  const price = Math.pow(1.0001, tick)
  return BigInt(Math.floor(Math.sqrt(price) * Number(Q96)))
}

type RangeResult = { liquidityDelta: bigint; amount0USDC: bigint; amount1PRISM: bigint; rangePosition: 'below' | 'in' | 'above' }

function computeFromPrism(prismRaw: bigint, sqrtPriceX96: bigint, tickLower: number, tickUpper: number): RangeResult | null {
  if (prismRaw <= 0n || sqrtPriceX96 <= 0n) return null
  const sqrtA = getSqrtAtTick(tickLower)
  const sqrtB = getSqrtAtTick(tickUpper)
  const sqrtP = sqrtPriceX96
  if (sqrtP <= sqrtA) return { liquidityDelta: 0n, amount0USDC: 0n, amount1PRISM: prismRaw, rangePosition: 'below' }
  if (sqrtP >= sqrtB) {
    const L = (prismRaw * Q96) / (sqrtB - sqrtA)
    return { liquidityDelta: L, amount0USDC: 0n, amount1PRISM: prismRaw, rangePosition: 'above' }
  }
  const L = (prismRaw * Q96) / (sqrtP - sqrtA)
  const amount0 = (L * (sqrtB - sqrtP) * Q96) / (sqrtP * sqrtB)
  return { liquidityDelta: L, amount0USDC: amount0, amount1PRISM: prismRaw, rangePosition: 'in' }
}

function computeFromUSDC(usdcRaw: bigint, sqrtPriceX96: bigint, tickLower: number, tickUpper: number): RangeResult | null {
  if (usdcRaw <= 0n || sqrtPriceX96 <= 0n) return null
  const sqrtA = getSqrtAtTick(tickLower)
  const sqrtB = getSqrtAtTick(tickUpper)
  const sqrtP = sqrtPriceX96
  if (sqrtP <= sqrtA) {
    const L = (usdcRaw * sqrtA * sqrtB) / ((sqrtB - sqrtA) * Q96)
    return { liquidityDelta: L, amount0USDC: usdcRaw, amount1PRISM: 0n, rangePosition: 'below' }
  }
  if (sqrtP >= sqrtB) return { liquidityDelta: 0n, amount0USDC: usdcRaw, amount1PRISM: 0n, rangePosition: 'above' }
  const L = (usdcRaw * sqrtP * sqrtB) / ((sqrtB - sqrtP) * Q96)
  const amount1 = (L * (sqrtP - sqrtA)) / Q96
  return { liquidityDelta: L, amount0USDC: usdcRaw, amount1PRISM: amount1, rangePosition: 'in' }
}

export function DepositForm() {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: 1301 })
  const { writeContractAsync: write } = useWriteContract()

  const [selectedFee, setSelectedFee] = useState<100 | 500 | 3000 | 10000>(500)
  const activeTier = FEE_TIERS.find(t => t.fee === selectedFee)!

  // Build pool key from selected fee tier
  const poolKey = {
    currency0:   ADDRESSES.USDC      as `0x${string}`,
    currency1:   ADDRESSES.PRISM     as `0x${string}`,
    fee:         activeTier.fee,
    tickSpacing: activeTier.tickSpacing,
    hooks:       ADDRESSES.PrismHook as `0x${string}`,
  }

  const slot = (activeTier.deployed && ADDRESSES.poolId) ? poolStateSlot(ADDRESSES.poolId) : undefined
  const { data: rawSlot } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: EXTSLOAD_ABI,
    functionName: 'extsload',
    args: slot ? [slot] : undefined,
    chainId: 1301,
    query: { enabled: !!ADDRESSES.PoolManager && !!slot, refetchInterval: 10_000 },
  })

  const { sqrtPriceX96, tick: currentTick } = useMemo(() => {
    if (!rawSlot || rawSlot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return { sqrtPriceX96: 0n, tick: 0 }
    }
    return decodeSlot0(rawSlot)
  }, [rawSlot])

  const ts = activeTier.tickSpacing
  const defaultLower = String(Math.floor((currentTick - 250) / ts) * ts)
  const defaultUpper = String(Math.ceil((currentTick + 250) / ts) * ts)
  const [tickLower, setTickLower] = useState('')
  const [tickUpper, setTickUpper] = useState('')

  const effectiveLower = tickLower !== '' ? tickLower : (sqrtPriceX96 > 0n ? defaultLower : '-500')
  const effectiveUpper = tickUpper !== '' ? tickUpper : (sqrtPriceX96 > 0n ? defaultUpper : '500')

  const [primaryToken, setPrimaryToken] = useState<'PRISM' | 'USDC'>('PRISM')
  const [prismInput, setPrismInput] = useState('')
  const [usdcInput, setUsdcInput]   = useState('')
  const [step, setStep] = useState<'idle' | 'approve0' | 'approve1' | 'deposit' | 'done'>('idle')
  const [lastTx, setLastTx] = useState<`0x${string}` | null>(null)

  const { data: usdcBal } = useReadContract({
    address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId: 1301,
    query: { enabled: !!address && !!ADDRESSES.USDC },
  })
  const { data: prismBal } = useReadContract({
    address: ADDRESSES.PRISM, abi: ERC20_ABI, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId: 1301,
    query: { enabled: !!address && !!ADDRESSES.PRISM },
  })

  const tLower = Number(effectiveLower)
  const tUpper = Number(effectiveUpper)
  const tickError = !isNaN(tLower) && !isNaN(tUpper) && tLower >= tUpper ? 'Lower tick must be less than upper tick' : null

  const computed = useMemo(() => {
    if (isNaN(tLower) || isNaN(tUpper) || tLower >= tUpper || sqrtPriceX96 <= 0n) return null
    if (primaryToken === 'PRISM') {
      const raw = prismInput ? (() => { try { return parseUnits(prismInput, 6) } catch { return null } })() : null
      if (!raw || raw <= 0n) return null
      return computeFromPrism(raw, sqrtPriceX96, tLower, tUpper)
    } else {
      const raw = usdcInput ? (() => { try { return parseUnits(usdcInput, 6) } catch { return null } })() : null
      if (!raw || raw <= 0n) return null
      return computeFromUSDC(raw, sqrtPriceX96, tLower, tUpper)
    }
  }, [primaryToken, prismInput, usdcInput, sqrtPriceX96, tLower, tUpper])

  const computedUSDC  = computed?.amount0USDC  ?? null
  const computedPRISM = computed?.amount1PRISM ?? null
  const usdcDisplay   = computedUSDC  != null ? parseFloat(formatUnits(computedUSDC,  6)).toFixed(6) : null
  const prismDisplay  = computedPRISM != null ? parseFloat(formatUnits(computedPRISM, 6)).toFixed(6) : null

  const rangeLabel =
    computed?.rangePosition === 'above' ? `Price above range: only PRISM (token1) needed · tick ${currentTick}` :
    computed?.rangePosition === 'below' ? `Price below range: only USDC (token0) needed · tick ${currentTick}` :
    computed?.rangePosition === 'in'    ? `In range: both PRISM + USDC needed · tick ${currentTick}` :
    sqrtPriceX96 > 0n ? `Current tick: ${currentTick}` : 'Loading pool price…'

  const rangeColor =
    computed?.rangePosition === 'above' ? 'var(--lpy-base)' :
    computed?.rangePosition === 'in'    ? 'var(--lpd-base)' :
    computed?.rangePosition === 'below' ? 'var(--vault-base)' :
    'var(--text-tertiary)'

  const usdcNeeded  = computed?.amount0USDC  ?? 0n
  const prismNeeded = computed?.amount1PRISM ?? 0n
  const prismInsufficient = prismNeeded > 0n && prismBal != null && prismNeeded > prismBal
  const usdcInsufficient  = usdcNeeded  > 0n && usdcBal  != null && usdcNeeded  > usdcBal

  const needsUsdcApprove  = usdcNeeded  > 0n
  const needsPrismApprove = prismNeeded > 0n
  const canSubmit = !tickError && !!computed && computed.liquidityDelta > 0n
    && !prismInsufficient && !usdcInsufficient && step === 'idle' && activeTier.deployed
  const isLoading = step !== 'idle' && step !== 'done'

  const stepLabel: Record<typeof step, string> = {
    idle:     'Approve & Deposit',
    approve0: needsUsdcApprove ? 'Approving USDC…' : 'Approving PRISM…',
    approve1: needsPrismApprove ? 'Approving PRISM…' : 'Approving USDC…',
    deposit:  'Depositing…',
    done:     'Deposited',
  }

  async function submit() {
    if (!ADDRESSES.PrismRouter || !ADDRESSES.USDC || !ADDRESSES.PRISM || !computed || !canSubmit) return
    try {
      if (needsUsdcApprove) {
        setStep('approve0')
        const tx0 = await write({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.PrismRouter, MAX_APPROVE], chainId: 1301 })
        const r0 = await client?.waitForTransactionReceipt({ hash: tx0 })
        if (r0?.status === 'reverted') throw new Error('USDC approve reverted on-chain')
      }
      if (needsPrismApprove) {
        setStep('approve1')
        const tx1 = await write({ address: ADDRESSES.PRISM, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.PrismRouter, MAX_APPROVE], chainId: 1301 })
        const r1 = await client?.waitForTransactionReceipt({ hash: tx1 })
        if (r1?.status === 'reverted') throw new Error('PRISM approve reverted on-chain')
      }
      setStep('deposit')
      const tx2 = await write({
        address: ADDRESSES.PrismRouter,
        abi: PRISM_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [poolKey, { tickLower: tLower, tickUpper: tUpper, liquidityDelta: computed.liquidityDelta, salt: ZERO_BYTES32 }],
        chainId: 1301,
      })
      const r2 = await client?.waitForTransactionReceipt({ hash: tx2 })
      if (r2?.status === 'reverted') throw new Error('addLiquidity reverted on-chain')
      setLastTx(tx2)
      setStep('done')
      const usdcStr  = usdcNeeded  > 0n ? `${parseFloat(formatUnits(usdcNeeded,  6)).toFixed(2)} USDC`  : null
      const prismStr = prismNeeded > 0n ? `${parseFloat(formatUnits(prismNeeded, 6)).toFixed(2)} PRISM` : null
      toast.success('Liquidity deposited', {
        description: [prismStr, usdcStr].filter(Boolean).join(' + ') + ` · ticks [${tLower}, ${tUpper}]`,
        action: { label: 'View ↗', onClick: () => window.open(BLOCKSCOUT + tx2, '_blank') },
      })
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message
      toast.error('Deposit failed', { description: msg.slice(0, 120) })
      setStep('idle')
    }
  }

  // ── Success state ────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Animated split visualizer — the money shot */}
        <div style={{ padding: '20px', background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="var(--positive)" strokeWidth="1.5" />
              <polyline points="4,8 7,11 12,5" stroke="var(--positive)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--positive)' }}>Deposit confirmed</span>
          </div>
          <SplitVisualizer lpyValue={700} lpdValue={300} vaultValue={134} animated={true} size="lg" />
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12, fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>
            Your position has been split into LP-Y and LP-D tokens.
          </p>
        </div>

        {/* Tx link */}
        {lastTx && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', color: 'var(--text-tertiary)' }}>
              {lastTx.slice(0, 10)}…{lastTx.slice(-6)}
            </span>
            <a href={BLOCKSCOUT + lastTx} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}>
              View on Blockscout ↗
            </a>
          </div>
        )}

        {/* Reset */}
        <button
          onClick={() => { setStep('idle'); setLastTx(null); setPrismInput(''); setUsdcInput('') }}
          style={{
            width: '100%', padding: '10px', background: 'none',
            border: '1px solid var(--border-default)', color: 'var(--text-secondary)',
            fontSize: 13, cursor: 'pointer', transition: 'border-color 150ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
        >
          Deposit Again
        </button>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Range indicator */}
      <div style={{
        padding: '8px 12px', border: '1px solid var(--border-subtle)',
        background: 'var(--bg-raised)',
      }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', color: rangeColor }}>
          {rangeLabel}
        </span>
      </div>

      {/* Tick inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {([['TICK LOWER', effectiveLower, setTickLower] as const, ['TICK UPPER', effectiveUpper, setTickUpper] as const]).map(([label, val, setter]) => (
          <div key={label}>
            <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
              {label}
            </label>
            <input
              type="number"
              value={label === 'TICK LOWER' ? (tickLower !== '' ? tickLower : val) : (tickUpper !== '' ? tickUpper : val)}
              onChange={e => setter(e.target.value)}
              placeholder={val}
              style={{
                width: '100%', padding: '8px 10px',
                background: 'var(--bg-raised)', border: '1px solid var(--border-default)',
                color: 'var(--text-primary)', fontSize: 13,
                fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)',
                outline: 'none',
              }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)' }}
            />
          </div>
        ))}
      </div>
      {tickError && (
        <span style={{ fontSize: 11, color: 'var(--warning)' }}>{tickError}</span>
      )}

      {/* Primary token toggle */}
      <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
        {(['PRISM', 'USDC'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setPrimaryToken(t); setPrismInput(''); setUsdcInput('') }}
            style={{
              flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: 'pointer', border: 'none',
              background: primaryToken === t ? 'var(--bg-overlay)' : 'transparent',
              color: primaryToken === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              transition: 'background 150ms, color 150ms',
            }}
          >
            Enter {t}
          </button>
        ))}
      </div>

      {/* Primary input */}
      {primaryToken === 'PRISM' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>PRISM AMOUNT</label>
            {prismBal != null && (
              <button
                onClick={() => setPrismInput(formatUnits(prismBal, 6))}
                style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--lpd-base)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                MAX {parseFloat(formatUnits(prismBal, 6)).toFixed(2)}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-raised)', border: `1px solid var(--border-default)`, padding: '10px 12px' }}>
            <input
              type="number" placeholder="0.00" value={prismInput}
              onChange={e => setPrismInput(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 18, color: 'var(--text-primary)' }}
            />
            <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>PRISM</span>
          </div>
          {prismInsufficient && <span style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4, display: 'block' }}>Insufficient PRISM balance</span>}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>USDC AMOUNT</label>
            {usdcBal != null && (
              <button
                onClick={() => setUsdcInput(formatUnits(usdcBal, 6))}
                style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--vault-base)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                MAX {parseFloat(formatUnits(usdcBal, 6)).toFixed(2)}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-raised)', border: `1px solid var(--border-default)`, padding: '10px 12px' }}>
            <input
              type="number" placeholder="0.00" value={usdcInput}
              onChange={e => setUsdcInput(e.target.value)}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 18, color: 'var(--text-primary)' }}
            />
            <span style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>USDC</span>
          </div>
          {usdcInsufficient && <span style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4, display: 'block' }}>Insufficient USDC balance</span>}
        </div>
      )}

      {/* Computed counterpart (in-range only) */}
      {computed && computed.rangePosition === 'in' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <label style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              {primaryToken === 'PRISM' ? 'USDC REQUIRED' : 'PRISM REQUIRED'}
            </label>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>auto-calculated</span>
          </div>
          <div style={{
            padding: '10px 12px', background: 'var(--bg-raised)',
            border: `1px solid ${(primaryToken === 'PRISM' ? usdcInsufficient : prismInsufficient) ? 'rgba(220,38,38,0.3)' : 'var(--border-subtle)'}`,
            fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 14,
            color: (primaryToken === 'PRISM' ? usdcInsufficient : prismInsufficient) ? 'var(--negative)' : 'var(--text-secondary)',
          }}>
            {primaryToken === 'PRISM' ? (usdcDisplay ?? '—') : (prismDisplay ?? '—')}
          </div>
          {primaryToken === 'PRISM' && usdcInsufficient && <span style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4, display: 'block' }}>Insufficient USDC balance</span>}
          {primaryToken === 'USDC' && prismInsufficient && <span style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4, display: 'block' }}>Insufficient PRISM balance</span>}
        </div>
      )}

      {/* Fee tier selector */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
          FEE TIER
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {FEE_TIERS.map(tier => {
            const active = selectedFee === tier.fee
            return (
              <button
                key={tier.fee}
                onClick={() => {
                  setSelectedFee(tier.fee as 100 | 500 | 3000 | 10000)
                  setTickLower('')
                  setTickUpper('')
                }}
                style={{
                  padding: '8px 4px', textAlign: 'center',
                  background: active ? 'var(--bg-overlay)' : 'var(--bg-raised)',
                  border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 150ms, border-color 150ms',
                  opacity: tier.deployed ? 1 : 0.45,
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 13, fontWeight: 400,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                  {tier.label}
                </div>
                {!tier.deployed && (
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '0.06em' }}>
                    not deployed
                  </div>
                )}
                {tier.deployed && !active && (
                  <div style={{ fontSize: 9, color: 'var(--positive)', marginTop: 2, letterSpacing: '0.06em' }}>
                    ● live
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {!activeTier.deployed && (
          <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 8 }}>
            Pool not deployed for this fee tier. Select 0.05% to deposit.
          </p>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
        {[
          `Fee ${activeTier.label}`,
          `Tick spacing ${activeTier.tickSpacing}`,
          `USDC / PRISM`,
        ].map(s => (
          <span key={s} style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)' }}>{s}</span>
        ))}
      </div>

      {/* Step progress indicator */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
          {(['approve0', 'approve1', 'deposit'] as const).map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: step === s ? 'var(--lpd-base)' : 'var(--border-strong)',
                animation: step === s ? 'live-pulse 1s ease-in-out infinite' : 'none',
              }} />
              {i < 2 && <div style={{ width: 16, height: 1, background: 'var(--border-subtle)' }} />}
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>{stepLabel[step]}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={submit}
        disabled={isLoading || !canSubmit || !ADDRESSES.PrismRouter}
        style={{
          width: '100%', padding: '12px',
          background: canSubmit && !isLoading ? 'var(--text-primary)' : 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          color: canSubmit && !isLoading ? 'var(--bg-base)' : 'var(--text-tertiary)',
          fontSize: 13, fontWeight: 500, cursor: isLoading || !canSubmit ? 'not-allowed' : 'pointer',
          transition: 'background 150ms, color 150ms',
          opacity: !ADDRESSES.PrismRouter ? 0.4 : 1,
        }}
      >
        {stepLabel[step]}
      </button>
    </div>
  )
}
