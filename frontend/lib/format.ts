/**
 * Prism number formatting utilities.
 * Every number shown to users must go through one of these functions.
 * No raw bigints, no sqrtPriceX96, no basis-points-as-integers in JSX.
 */

const Q96 = 2n ** 96n

/** Converts bigint (with `decimals` scale) to "$X.XX" */
export function formatUSD(value: bigint | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '--'
  const neg = value < 0n
  const abs = neg ? -value : value
  const scale = 10n ** BigInt(decimals)
  const whole = abs / scale
  const frac  = abs % scale
  // pad fraction to `decimals` digits then take first 2
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 2)
  const intStr  = whole.toLocaleString('en-US')
  return `${neg ? '-' : ''}$${intStr}.${fracStr}`
}

/** Converts a JavaScript number dollar value to "$X.XX" */
export function formatUSDNum(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value as number)) return '--'
  const neg = value < 0
  const abs = Math.abs(value)
  return `${neg ? '-' : ''}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Converts basis points to "X.X%" */
export function formatPercent(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return '--'
  return (bps / 100).toFixed(1) + '%'
}

/** Converts a 0–1 fraction (float) to "X.X%" */
export function formatPercentFraction(fraction: number | null | undefined): string {
  if (fraction === null || fraction === undefined || isNaN(fraction as number)) return '--'
  return (fraction * 100).toFixed(1) + '%'
}

/** Truncates address: "0x1234…5678" */
export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}…${address.slice(-chars)}`
}

/**
 * Converts v4 liquidity + tick range to approximate token amounts, then USD.
 * Both tokens are 6 decimals (USDC = token0, PRISM = token1).
 * Uses the correct per-region formula depending on price vs range:
 *   below range: all token0 (USDC), amount0 = L * (1/sqrtA - 1/sqrtB)
 *   in range:    both tokens
 *   above range: all token1 (PRISM), amount1 = L * (sqrtB - sqrtA) / Q96
 */
export function formatLiquidityToUSD(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  tickLower?: number,
  tickUpper?: number,
): string {
  if (!liquidity || liquidity === 0n || !sqrtPriceX96 || sqrtPriceX96 === 0n) return '--'
  try {
    const sqrtA = tickLower !== undefined
      ? BigInt(Math.floor(Math.sqrt(Math.pow(1.0001, tickLower)) * Number(Q96)))
      : sqrtPriceX96
    const sqrtB = tickUpper !== undefined
      ? BigInt(Math.floor(Math.sqrt(Math.pow(1.0001, tickUpper)) * Number(Q96)))
      : sqrtPriceX96
    const sqrtP = sqrtPriceX96

    let amount0 = 0n  // USDC units (6 dec)
    let amount1 = 0n  // PRISM units (6 dec)

    if (sqrtP <= sqrtA) {
      // below range — all USDC
      // amount0 = L * Q96 * (sqrtB - sqrtA) / (sqrtA * sqrtB)
      amount0 = (liquidity * Q96 * (sqrtB - sqrtA)) / (sqrtA * sqrtB)
    } else if (sqrtP >= sqrtB) {
      // above range — all PRISM
      // amount1 = L * (sqrtB - sqrtA) / Q96
      amount1 = (liquidity * (sqrtB - sqrtA)) / Q96
    } else {
      // in range — both tokens
      amount0 = (liquidity * Q96 * (sqrtB - sqrtP)) / (sqrtP * sqrtB)
      amount1 = (liquidity * (sqrtP - sqrtA)) / Q96
    }

    // USDC ≈ $1. PRISM value at current pool price (sqrtP^2 * 1e6 / 1e6 cancels to sqrtP^2)
    // price = (sqrtP/Q96)^2 USDC per PRISM (both 6 dec → no adjustment)
    const prismPriceUSD = (Number(sqrtPriceX96) / Number(Q96)) ** 2

    const usd0 = Number(amount0) / 1e6
    const usd1 = (Number(amount1) / 1e6) * prismPriceUSD

    const total = usd0 + usd1
    return formatUSDNum(total)
  } catch {
    return '--'
  }
}

/** Relative time: "just now", "3m ago", "2h ago", "4 days ago" */
export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() / 1000) - timestamp)
  if (diffSec < 10)       return 'just now'
  if (diffSec < 3600)     return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400)    return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)} days ago`
}

/**
 * Converts WAD-scaled IL fraction (1e18 = 100%) to a signed percentage string.
 * Returns { value: "-13.4%", isNegative: true } for a loss.
 */
export function formatIL(ilRaw: bigint | null | undefined): { value: string; isNegative: boolean } {
  if (ilRaw === null || ilRaw === undefined) return { value: '--', isNegative: false }
  const fraction = Number(ilRaw) / 1e18
  const pct = fraction * 100
  const isNegative = pct < 0
  const sign = isNegative ? '' : pct > 0 ? '+' : ''
  return { value: `${sign}${pct.toFixed(1)}%`, isNegative }
}

/** Formats a raw 6-decimal bigint as a plain number string ("123.45") */
export function formatToken6(value: bigint | null | undefined): string {
  if (value === null || value === undefined) return '--'
  const whole = value / 1_000_000n
  const frac  = value % 1_000_000n
  return `${whole.toLocaleString('en-US')}.${frac.toString().padStart(6, '0').slice(0, 2)}`
}

/** Pool price from sqrtPriceX96, both tokens 6 decimals */
export function sqrtPriceToPrice(sqrtPriceX96: bigint): number {
  const ratio = Number(sqrtPriceX96) / Number(Q96)
  return ratio * ratio // both 6 dec → no adjustment
}

/** Formats pool price as "$X.XXXX" */
export function formatPoolPrice(sqrtPriceX96: bigint | null | undefined): string {
  if (!sqrtPriceX96 || sqrtPriceX96 === 0n) return '--'
  const price = sqrtPriceToPrice(sqrtPriceX96)
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
}
