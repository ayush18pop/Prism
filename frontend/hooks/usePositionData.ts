'use client'
import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { ADDRESSES } from '@/lib/addresses'
import { PRISM_HOOK_ABI, ERC1155_ABI } from '@/lib/abis'
import { formatUSD, formatIL, formatLiquidityToUSD } from '@/lib/format'

const Q96 = 2n ** 96n

function computeILFraction(entrySqrtPrice: bigint, currentSqrtPrice: bigint): bigint {
  if (!entrySqrtPrice || entrySqrtPrice === 0n || !currentSqrtPrice) return 0n
  // WAD-scaled: (currentSqrtPrice * 1e18 / entrySqrtPrice) - 1e18
  return (currentSqrtPrice * BigInt(1e18) / entrySqrtPrice) - BigInt(1e18)
}

/** Full position state for a single posId */
export function usePositionData(
  posId: `0x${string}` | undefined,
  account: `0x${string}` | undefined,
  currentSqrtPrice: bigint,
  currentTick: number,
) {
  const tokenId = posId ? BigInt(`0x${posId.slice(2)}`) : undefined

  const { data: pos, isLoading: posLoading } = useReadContract({
    address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'getPosition',
    args: posId ? [posId] : undefined, chainId: 1301,
    query: { enabled: !!posId && !!ADDRESSES.PrismHook, refetchInterval: 5_000 },
  })

  const { data: vault } = useReadContract({
    address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'lpDCollateralVault',
    args: posId ? [posId] : undefined, chainId: 1301,
    query: { enabled: !!posId, refetchInterval: 5_000 },
  })

  const { data: ilComp } = useReadContract({
    address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'lpYCompensation',
    args: posId ? [posId] : undefined, chainId: 1301,
    query: { enabled: !!posId, refetchInterval: 5_000 },
  })

  const { data: lpyBal } = useReadContract({
    address: ADDRESSES.LPYToken, abi: ERC1155_ABI, functionName: 'balanceOf',
    args: account && tokenId ? [account, tokenId] : undefined, chainId: 1301,
    query: { enabled: !!account && !!tokenId, refetchInterval: 5_000 },
  })

  const { data: lpdBal } = useReadContract({
    address: ADDRESSES.LPDToken, abi: ERC1155_ABI, functionName: 'balanceOf',
    args: account && tokenId ? [account, tokenId] : undefined, chainId: 1301,
    query: { enabled: !!account && !!tokenId, refetchInterval: 5_000 },
  })

  const { data: lpdFees } = useReadContract({
    address: ADDRESSES.PrismHook, abi: PRISM_HOOK_ABI, functionName: 'lpDFeesClaimable',
    args: posId ? [posId] : undefined, chainId: 1301,
    query: { enabled: !!posId, refetchInterval: 5_000 },
  })

  return useMemo(() => {
    if (!pos || posLoading) return { exists: false, isLoading: true }

    const posArr = pos as unknown as { poolId: `0x${string}`; entrySqrtPrice: bigint; tickLower: number; tickUpper: number; liquidity: bigint; lpDHolder: `0x${string}`; feeShareBpsLPD: bigint; lpDSold: boolean; settled: boolean }
    const { poolId, entrySqrtPrice, tickLower, tickUpper, liquidity, lpDHolder, feeShareBpsLPD, lpDSold, settled } = posArr

    const inRange = currentTick >= tickLower && currentTick <= tickUpper
    const ilRaw = entrySqrtPrice > 0n ? computeILFraction(entrySqrtPrice, currentSqrtPrice) : 0n
    const ilFormatted = formatIL(ilRaw)
    const posValueUSD = settled ? '--' : formatLiquidityToUSD(liquidity, currentSqrtPrice, tickLower, tickUpper)

    return {
      exists: true, isLoading: false,
      // Raw
      poolId, entrySqrtPrice, tickLower, tickUpper, liquidity, lpDHolder,
      feeShareBpsLPD: Number(feeShareBpsLPD), lpDSold, settled,
      // Balances
      lpyBalance: lpyBal ?? 0n,
      lpdBalance: lpdBal ?? 0n,
      hasLPY: (lpyBal ?? 0n) > 0n,
      hasLPD: (lpdBal ?? 0n) > 0n,
      // Formatted
      collateralVault: formatUSD(vault as bigint | undefined, 6),
      collateralVaultRaw: (vault ?? 0n) as bigint,
      ilCompensation: formatUSD(ilComp as bigint | undefined, 6),
      ilCompensationRaw: (ilComp ?? 0n) as bigint,
      currentIL: ilFormatted.value,
      currentILIsNegative: ilFormatted.isNegative,
      currentILRaw: ilRaw,
      positionValueUSD: posValueUSD,
      inRange,
      // LP-D fees
      lpdFees: lpdFees as [bigint, bigint] | undefined,
    }
  }, [pos, posLoading, vault, ilComp, lpyBal, lpdBal, lpdFees, currentSqrtPrice, currentTick])
}
