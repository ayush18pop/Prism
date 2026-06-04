'use client'
import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { ADDRESSES } from '@/lib/addresses'

const POSITION_OPENED = parseAbiItem(
  'event PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 collateral)'
)

const CHUNK = 2000n

/** Returns all posIds for an address by filtering PositionOpened events */
export function usePositionList(address: `0x${string}` | undefined) {
  const client = usePublicClient({ chainId: 1301 })

  const { data, isLoading, error } = useQuery({
    queryKey: ['positionList', address, ADDRESSES.PrismHook],
    enabled: !!client && !!address && !!ADDRESSES.PrismHook,
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!client || !address || !ADDRESSES.PrismHook) return []
      const current = await client.getBlockNumber()
      const from = BigInt(ADDRESSES.deployBlock)
      const allLogs: typeof logs = []
      let logs: Awaited<ReturnType<typeof client.getLogs>> = []
      for (let b = from; b <= current; b += CHUNK) {
        const chunk = await client.getLogs({
          address: ADDRESSES.PrismHook,
          event: POSITION_OPENED,
          fromBlock: b,
          toBlock: b + CHUNK - 1n > current ? current : b + CHUNK - 1n,
        })
        allLogs.push(...chunk)
      }
      // extract posIds from all events (they're all relevant; filter by lp later in PositionCard)
      return allLogs.map(l => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lAny = l as any
        return {
          posId: (lAny.args?.posId ?? '0x') as `0x${string}`,
          collateral: (lAny.args?.collateral ?? 0n) as bigint,
          blockNumber: l.blockNumber,
          txHash: l.transactionHash,
          timestamp: 0,
        }
      })
    },
  })

  return { positions: data ?? [], isLoading, error: error ? String(error) : null }
}
