'use client'

import { useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI, ERC1155_ABI } from '@/lib/abis'

export function usePosition(posId: `0x${string}` | undefined) {
  return useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'getPosition',
    args: posId ? [posId] : undefined,
    chainId: 1301,
    query: { enabled: !!posId && !!ADDRESSES.PrismHook },
  })
}

export function useVault(posId: `0x${string}` | undefined) {
  return useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'lpDCollateralVault',
    args: posId ? [posId] : undefined,
    chainId: 1301,
    query: { enabled: !!posId && !!ADDRESSES.PrismHook },
  })
}

export function useILCompensation(posId: `0x${string}` | undefined) {
  return useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'lpYCompensation',
    args: posId ? [posId] : undefined,
    chainId: 1301,
    query: { enabled: !!posId && !!ADDRESSES.PrismHook },
  })
}

export function useLPDClaimable(posId: `0x${string}` | undefined) {
  return useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'lpDClaimable',
    args: posId ? [posId] : undefined,
    chainId: 1301,
    query: { enabled: !!posId && !!ADDRESSES.PrismHook },
  })
}

export function useStandingBid(poolId: `0x${string}` | undefined) {
  // Reads the most recently posted bid (nextBidId - 1). Callers check .active.
  const { data: nextId } = useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'nextBidId',
    args: poolId ? [poolId] : undefined,
    chainId: 1301,
    query: { enabled: !!poolId && !!ADDRESSES.PrismHook },
  })
  const bidId = nextId != null && (nextId as bigint) > 0n ? (nextId as bigint) - 1n : undefined
  const result = useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'bids',
    args: poolId && bidId != null ? [poolId, bidId] : undefined,
    chainId: 1301,
    query: { enabled: !!poolId && bidId != null && !!ADDRESSES.PrismHook },
  })
  return { ...result, bidId }
}

const POSITION_OPENED_EVENT = parseAbiItem(
  'event PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 ilCoverageBps, uint256 collateral)'
)

const CHUNK_SIZE = 5000n

export function usePositionLogs() {
  const client = usePublicClient({ chainId: 1301 })
  return useQuery({
    queryKey: ['positionOpened', ADDRESSES.PrismHook],
    queryFn: async () => {
      if (!client || !ADDRESSES.PrismHook) return []
      const currentBlock = await client.getBlockNumber()
      const allLogs = []
      for (let from = ADDRESSES.deployBlock; from <= currentBlock; from += CHUNK_SIZE) {
        const to = from + CHUNK_SIZE - 1n > currentBlock ? currentBlock : from + CHUNK_SIZE - 1n
        const chunk = await client.getLogs({
          address: ADDRESSES.PrismHook,
          event: POSITION_OPENED_EVENT,
          fromBlock: from,
          toBlock: to,
        })
        allLogs.push(...chunk)
      }
      return allLogs
    },
    enabled: !!client && !!ADDRESSES.PrismHook,
    refetchInterval: 30_000,
  })
}

export function useLPDFeesClaimable(posId: `0x${string}` | undefined) {
  return useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'lpDFeesClaimable',
    args: posId ? [posId] : undefined,
    chainId: 1301,
    query: { enabled: !!posId && !!ADDRESSES.PrismHook },
  })
}

export interface MyPosition {
  posId: `0x${string}`
  initialCollateral: bigint
}

export function useMyPositions(
  account: `0x${string}` | undefined,
  allLogs: ReturnType<typeof usePositionLogs>['data'],
) {
  const client = usePublicClient({ chainId: 1301 })
  return useQuery({
    queryKey: ['myPositions', account, ADDRESSES.LPYToken, ADDRESSES.LPDToken, allLogs?.length],
    queryFn: async (): Promise<MyPosition[]> => {
      if (!client || !account || !allLogs || !ADDRESSES.LPYToken || !ADDRESSES.LPDToken) return []
      const results = await Promise.all(
        allLogs.map(async log => {
          const posId = log.args.posId as `0x${string}`
          const tokenId = BigInt(posId)
          const [lpY, lpD] = await Promise.all([
            client.readContract({ address: ADDRESSES.LPYToken!, abi: ERC1155_ABI, functionName: 'balanceOf', args: [account, tokenId] }),
            client.readContract({ address: ADDRESSES.LPDToken!, abi: ERC1155_ABI, functionName: 'balanceOf', args: [account, tokenId] }),
          ])
          return { posId, lpY, lpD, initialCollateral: (log.args.collateral as bigint) ?? 0n }
        })
      )
      return results
        .filter(r => r.lpY > 0n || r.lpD > 0n)
        .map(r => ({ posId: r.posId, initialCollateral: r.initialCollateral }))
    },
    enabled: !!client && !!account && !!allLogs && allLogs.length > 0,
    refetchInterval: 30_000,
  })
}

export function useSettleLPD() {
  return useWriteContract()
}

export function useClaimILComp() {
  return useWriteContract()
}

export function useClaimLPDCollateral() {
  return useWriteContract()
}

export function useSetStandingBid() {
  return useWriteContract()
}

export function useClaimFeesLPD() {
  return useWriteContract()
}

const FEES_CLAIMED_EVENT = parseAbiItem(
  'event FeesClaimed(bytes32 indexed posId, address recipient, uint256 fees0, uint256 fees1)'
)
const LPD_FEES_CLAIMED_EVENT = parseAbiItem(
  'event LPDFeesClaimed(bytes32 indexed posId, address recipient, uint256 amount0, uint256 amount1)'
)

export interface FeeHistory {
  lpYTotal0: bigint   // LP-Y portion of token0 (USDC) across all claims
  lpYTotal1: bigint   // LP-Y portion of token1 (PRISM) across all claims
  lpDTotal0: bigint   // LP-D portion claimed (token0)
  lpDTotal1: bigint   // LP-D portion claimed (token1)
  claimCount: number
}

export function useFeeHistory(
  posId: `0x${string}` | undefined,
  feeShareBpsLPD: number,
) {
  const client = usePublicClient({ chainId: 1301 })
  return useQuery<FeeHistory>({
    queryKey: ['feeHistory', posId, ADDRESSES.PrismHook],
    queryFn: async () => {
      if (!client || !posId || !ADDRESSES.PrismHook) {
        return { lpYTotal0: 0n, lpYTotal1: 0n, lpDTotal0: 0n, lpDTotal1: 0n, claimCount: 0 }
      }
      const [lpYLogs, lpdLogs] = await Promise.all([
        client.getLogs({
          address: ADDRESSES.PrismHook,
          event: FEES_CLAIMED_EVENT,
          args: { posId },
          fromBlock: ADDRESSES.deployBlock,
          toBlock: 'latest',
        }),
        client.getLogs({
          address: ADDRESSES.PrismHook,
          event: LPD_FEES_CLAIMED_EVENT,
          args: { posId },
          fromBlock: ADDRESSES.deployBlock,
          toBlock: 'latest',
        }),
      ])

      const phi = BigInt(feeShareBpsLPD)
      let lpYTotal0 = 0n, lpYTotal1 = 0n
      for (const log of lpYLogs) {
        const f0 = (log.args.fees0 ?? 0n) as bigint
        const f1 = (log.args.fees1 ?? 0n) as bigint
        lpYTotal0 += f0 * (10000n - phi) / 10000n
        lpYTotal1 += f1 * (10000n - phi) / 10000n
      }

      let lpDTotal0 = 0n, lpDTotal1 = 0n
      for (const log of lpdLogs) {
        lpDTotal0 += (log.args.amount0 ?? 0n) as bigint
        lpDTotal1 += (log.args.amount1 ?? 0n) as bigint
      }

      return { lpYTotal0, lpYTotal1, lpDTotal0, lpDTotal1, claimCount: lpYLogs.length }
    },
    enabled: !!client && !!posId && !!ADDRESSES.PrismHook,
    refetchInterval: 30_000,
  })
}
