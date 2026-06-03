'use client'

import { useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI } from '@/lib/abis'

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
  return useReadContract({
    address: ADDRESSES.PrismHook,
    abi: PRISM_HOOK_ABI,
    functionName: 'standingBids',
    args: poolId ? [poolId] : undefined,
    chainId: 1301,
    query: { enabled: !!poolId && !!ADDRESSES.PrismHook },
  })
}

const POSITION_OPENED_EVENT = parseAbiItem(
  'event PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 collateral)'
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
      console.log('[usePositionLogs] found', allLogs.length, 'events across', String((currentBlock - ADDRESSES.deployBlock) / CHUNK_SIZE + 1n), 'chunks')
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
