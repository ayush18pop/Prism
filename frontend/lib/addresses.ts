// Deployed on Unichain Sepolia — block 54316990
// Pool: MockUSDC/PRISM, fee=500 (0.05%), tickSpacing=10
const deployments = {
  PrismHook:     '0x803910F242E646167f6f5D84B26B937f2dc18700',
  LPYToken:      '0x1843dDD4cc0230215F9F4d365Bce0a8641d6F91a',
  LPDToken:      '0x52e099B7BBCbf8DD8b95262D76888481d827603A',
  PrismCallback: '0xC2fa93c8a4465D0e6471f6134cBBAfAE02b91862',
  PrismRouter:   '0xfc8c790402f4D2E8c1049B2E3B0af43c3878Ec51',
  USDC:          '0x1f30D01D1766F26e62f8Aa7Dd5703a57E53183A3',
  WETH:          '0x4200000000000000000000000000000000000006',
  PRISM:         '0xCf864db2623735b28BEC4863490e19b13C7B1a5F',
  PoolManager:   '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
  PrismRSC:      '0x9cE77Adb151ce54F6b5EABF90f868d800647f175',
  poolId:        '0xb15980e9e3a2e4d9a5698812f5e7603fee342bfd5a0c56afa8debc7d76019d96',
  deployBlock:   54316990,
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

// MockUSDC (0x1f30...) < PRISM (0xCf86...) — USDC is currency0
export const DEMO_POOL_KEY = {
  currency0:   deployments.USDC      as `0x${string}`,
  currency1:   deployments.PRISM     as `0x${string}`,
  fee:         500  as const,
  tickSpacing: 10   as const,
  hooks:       deployments.PrismHook as `0x${string}`,
}
