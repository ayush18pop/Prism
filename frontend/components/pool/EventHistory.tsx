'use client'

import { usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { parseAbiItem, formatUnits } from 'viem'
import { ADDRESSES } from '@/lib/addresses'

const CHUNK = 5000n

const EVENTS = [
  parseAbiItem('event PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 collateral)'),
  parseAbiItem('event LPDAutoPurchased(bytes32 indexed posId, address buyer, uint256 usdcCost, uint256 feeShareBpsLPD)'),
  parseAbiItem('event LPDSettled(bytes32 indexed posId, uint256 ilCost, uint256 refundedToHolder)'),
  parseAbiItem('event LPDLiquidated(bytes32 indexed posId, uint256 collateralConsumed)'),
  parseAbiItem('event ILCompensationClaimed(bytes32 indexed posId, address recipient, uint256 usdc)'),
]

type RawLog = {
  blockNumber: bigint
  transactionHash: `0x${string}`
  eventName: string
  args: Record<string, unknown>
  secondsAgo: number
}

function relativeTime(secondsAgo: number): string {
  if (secondsAgo < 60)  return 'just now'
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`
  return `${Math.floor(secondsAgo / 86400)}d ago`
}

function labelFor(name: string, args: Record<string, unknown>): { label: string; detail: string; color: string } {
  switch (name) {
    case 'PositionOpened': return {
      label: 'Position Opened',
      detail: args.collateral && (args.collateral as bigint) > 0n
        ? `+${formatUnits(args.collateral as bigint, 6)} USDC collateral locked`
        : 'no standing bid filled',
      color: 'text-violet-400',
    }
    case 'LPDAutoPurchased': return {
      label: 'LP-D Purchased',
      detail: `${formatUnits(args.usdcCost as bigint, 6)} USDC locked`,
      color: 'text-emerald-400',
    }
    case 'LPDSettled': return {
      label: 'LP-D Settled',
      detail: args.ilCost && (args.ilCost as bigint) > 0n
        ? `${formatUnits(args.ilCost as bigint, 6)} USDC IL · ${formatUnits(args.refundedToHolder as bigint, 6)} returned`
        : 'no IL, full refund',
      color: 'text-white/60',
    }
    case 'LPDLiquidated': return {
      label: 'LP-D Liquidated',
      detail: `${formatUnits(args.collateralConsumed as bigint, 6)} USDC consumed`,
      color: 'text-amber-400',
    }
    case 'ILCompensationClaimed': return {
      label: 'IL Comp Claimed',
      detail: `${formatUnits(args.usdc as bigint, 6)} USDC`,
      color: 'text-emerald-400',
    }
    default: return { label: name, detail: '', color: 'text-white/40' }
  }
}

export function EventHistory({ walletFilter }: { walletFilter?: `0x${string}` }) {
  const client = usePublicClient({ chainId: 1301 })

  const { data: result, isLoading } = useQuery({
    queryKey: ['prism-events', ADDRESSES.PrismHook, walletFilter],
    queryFn: async () => {
      if (!client || !ADDRESSES.PrismHook) return []
      const latest = await client.getBlockNumber()
      const allLogs: RawLog[] = []

      for (let from = ADDRESSES.deployBlock; from <= latest; from += CHUNK) {
        const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n
        const chunks = await Promise.all(
          EVENTS.map(event => client.getLogs({ address: ADDRESSES.PrismHook, event, fromBlock: from, toBlock: to }))
        )
        for (const chunk of chunks) {
          for (const log of chunk) {
            allLogs.push({
              blockNumber: log.blockNumber ?? 0n,
              transactionHash: log.transactionHash ?? '0x',
              eventName: (log as { eventName?: string }).eventName ?? '',
              args: (log.args ?? {}) as Record<string, unknown>,
              secondsAgo: Number(latest - (log.blockNumber ?? latest)),
            })
          }
        }
      }

      const sorted = allLogs.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1))

      if (!walletFilter) return sorted

      // Filter to events involving this wallet
      const wf = walletFilter.toLowerCase()
      return sorted.filter(log => {
        const buyer     = (log.args.buyer     as string | undefined)?.toLowerCase()
        const recipient = (log.args.recipient as string | undefined)?.toLowerCase()
        return buyer === wf || recipient === wf
      })
    },
    enabled: !!client && !!ADDRESSES.PrismHook,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!result?.length) {
    return (
      <p className="text-xs text-white/25 py-8 text-center">
        {walletFilter ? 'No events for your wallet yet.' : 'No events yet.'}
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {result.map((log, i) => {
        const { label, detail, color } = labelFor(log.eventName, log.args)
        const posId = log.args.posId as string | undefined
        return (
          <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.replace('text-', 'bg-')}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-xs font-medium ${color}`}>{label}</span>
                {posId && (
                  <span className="font-mono text-[10px] text-white/20">
                    {(posId as string).slice(0, 8)}…
                  </span>
                )}
              </div>
              {detail && <p className="text-[10px] text-white/30 mt-0.5">{detail}</p>}
            </div>
            <div className="text-right flex-shrink-0 space-y-0.5">
              <p className="font-mono text-[10px] text-white/25">{relativeTime(log.secondsAgo)}</p>
              <a
                href={`https://unichain-sepolia.blockscout.com/tx/${log.transactionHash}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-white/15 hover:text-white/40 transition-colors block"
              >
                txn ↗
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
