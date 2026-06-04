// Client-side IL display math — mirrors ILMath.sol for UI only.
// Never use these for on-chain settlement math.

const Q96 = 2n ** 96n

export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, token0Decimals = 6, token1Decimals = 6): number {
  // price (token1 per token0 in human units) = (sqrtPriceX96 / 2^96)^2 * 10^(d0 - d1)
  // Use float division — BigInt integer truncation loses all sub-unit precision near price=1
  const sqrtRatio = Number(sqrtPriceX96) / Number(Q96)
  const rawPrice  = sqrtRatio * sqrtRatio
  return rawPrice * 10 ** (token0Decimals - token1Decimals)
}

// WAD-scaled IL fraction: ε = sqrtCurrent/sqrtEntry - 1 (funded LP formula)
export function computeILFraction(entrySqrtPrice: bigint, currentSqrtPrice: bigint): number {
  const ratio = Number(currentSqrtPrice) / Number(entrySqrtPrice)
  return ratio - 1  // negative = IL (price dropped)
}

// USDC IL cost for display
export function ilCostUSDC(ilFraction: number, collateralUSDC: bigint): number {
  const frac = Math.abs(Math.min(ilFraction, 0))  // only negative IL draws collateral
  return (frac * Number(collateralUSDC)) / 1e6     // result in human USDC
}

// Percent IL relative to collateral
export function ilPercent(ilFraction: number): string {
  const pct = Math.abs(Math.min(ilFraction, 0)) * 100
  return pct.toFixed(2) + '%'
}
