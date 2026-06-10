// Deployed on Unichain Sepolia — block 54240730
// Pool: USDC/PRISM, fee=500 (0.05%), tickSpacing=10
const deployments = {
  PrismHook:     '0xbE169aD708CEA009236943607980DF7Ec8ec4700',
  LPYToken:      '0xf3077cCFBE8Be2cAAb7C5B763858e49b87f44513',
  LPDToken:      '0xd2AC3dB3021ea25d4D40Df5EF7764Aac10D87F3E',
  PrismCallback: '0x7cad80B54FEc3bEBf932688FDCdbD3926eedb1e1',
  PrismRouter:   '0xEdeDe6bBf1998172E42080276D5a05134eCa9636',
  USDC:          '0x31d0220469e10c4E71834a79b1f276d740d3768F',
  WETH:          '0x4200000000000000000000000000000000000006',
  PRISM:         '0xCf864db2623735b28BEC4863490e19b13C7B1a5F',
  PoolManager:   '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
  PrismRSC:      '0xd42dbe0b1373B0FBBb78E01a9489362187858a7f',
  poolId:        '0xa072e8c53693e3ad8ee2242ecbdad917c083bbf616328a4e2556fd73f72a8773',
  deployBlock:   54240730,
}

function addr(s: string): `0x${string}` | undefined {
  return s.startsWith('0x') && s.length === 42 ? (s as `0x${string}`) : undefined
}

export const ADDRESSES = {
  PrismHook:     addr(deployments.PrismHook),
  LPYToken:      addr(deployments.LPYToken),
  LPDToken:      addr(deployments.LPDToken),
  PrismCallback: addr(deployments.PrismCallback),
  PrismRouter:   addr(deployments.PrismRouter),
  USDC:          addr(deployments.USDC),
  WETH:          addr(deployments.WETH),
  PRISM:         addr(deployments.PRISM),
  PoolManager:   addr(deployments.PoolManager),
  PrismRSC:      deployments.PrismRSC ? addr(deployments.PrismRSC) : undefined,
  deployBlock:   BigInt(deployments.deployBlock),
  poolId:        deployments.poolId as `0x${string}`,
}

// USDC (0x31d0...) < PRISM (0xCf86...) — USDC is currency0
export const DEMO_POOL_KEY = {
  currency0:   deployments.USDC      as `0x${string}`,
  currency1:   deployments.PRISM     as `0x${string}`,
  fee:         500  as const,
  tickSpacing: 10   as const,
  hooks:       deployments.PrismHook as `0x${string}`,
}
