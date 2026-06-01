'use client'

import { useReadContract } from 'wagmi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ADDRESSES } from '@/lib/addresses'
import { sqrtPriceX96ToPrice } from '@/lib/ilMath'

const POOL_MANAGER_ABI = [
  { name: 'getSlot0', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ name: 'sqrtPriceX96', type: 'uint160' }, { name: 'tick', type: 'int24' }, { name: 'protocolFee', type: 'uint24' }, { name: 'lpFee', type: 'uint24' }] },
] as const

interface PoolStatsProps {
  poolId: `0x${string}` | undefined
}

export function PoolStats({ poolId }: PoolStatsProps) {
  const { data: slot0 } = useReadContract({
    address: ADDRESSES.PoolManager,
    abi: POOL_MANAGER_ABI,
    functionName: 'getSlot0',
    args: poolId ? [poolId] : undefined,
    chainId: 1301,
    query: { enabled: !!poolId && !!ADDRESSES.PoolManager, refetchInterval: 5_000 },
  })

  const sqrtPrice = slot0?.[0]
  const tick = slot0?.[1]
  const price = sqrtPrice ? sqrtPriceX96ToPrice(sqrtPrice) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pool State</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="ETH Price" value={price != null ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'} />
          <Stat label="Current Tick" value={tick != null ? tick.toString() : '—'} />
          <Stat label="sqrtPriceX96" value={sqrtPrice ? `${(Number(sqrtPrice) / 1e18).toFixed(4)}e18` : '—'} />
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-zinc-100">{value}</p>
    </div>
  )
}
