// Deployed on Unichain Sepolia — block 53622081
// New pool (fee=500, tickSpacing=10) initialized at block ~53636000
// Pool initialized at sqrtPriceX96 = Q96 (tick 0) — both USDC and PRISM are 6 decimals, so tick 0 = 1 PRISM : 1 USDC
// PrismRSC on Lasna (chain 5318007) — 0x7F6e422f3184CBa32b655147C7233CdD007552A2
const deployments = {
  PrismHook:     '0x31AbbBBEAF701E3da2B39c7211Bea52376BF8700',
  LPYToken:      '0x1239f52D329E877D0dA6f0551Cb16F0B231C7E74',
  LPDToken:      '0xaF6Da70D5AEE595CfEA77E83dD77974BE348D942',
  PrismCallback: '0x8bb28b3c2274d6d058E0cd7DEAC30774AEcb26BE',
  PrismRouter:   '0x0aA07c99f2aac6f00e690f05353cBB05f0E85110',
  USDC:          '0x31d0220469e10c4E71834a79b1f276d740d3768F',
  WETH:          '0x4200000000000000000000000000000000000006',
  PRISM:         '0xCf864db2623735b28BEC4863490e19b13C7B1a5F',
  PoolManager:   '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
  poolId:        '0x285d65ae5d9e811fb0cf2324907800addb23d9ec513a93707112e6709ae75b4a',
  deployBlock:   53678772,
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
  deployBlock:   BigInt(deployments.deployBlock),
  poolId:        deployments.poolId as `0x${string}`,
}

// USDC (0x31d0...) < PRISM (0xEAd1...) — USDC is currency0
// New pool: fee=500 (0.05%), tickSpacing=10, initialized at 1 PRISM = 1 USDC
export const DEMO_POOL_KEY = {
  currency0:   deployments.USDC      as `0x${string}`,
  currency1:   deployments.PRISM     as `0x${string}`,
  fee:         500  as const,
  tickSpacing: 10   as const,
  hooks:       deployments.PrismHook as `0x${string}`,
}
