// Deployed on Unichain Sepolia — block 54347616 (June 11 redeploy: stranded-collateral fix)
// Pool: USDC/PRISM, fee=3000 (0.30%), tickSpacing=60
// PrismCallback authorized sender: 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4 (Reactive proxy)
const deployments = {
  PrismHook:     '0x77D7dE89E589955aD9f0bF2d96109bA3bfC28700',
  LPYToken:      '0xAc03a4479f8145CC6aA309462dB67F37988e551E',
  LPDToken:      '0xE1bE73219fC9D920351272daf40258E1107127C2',
  PrismCallback: '0x8bc8F38d45eE60cAA22c9d492b39D1b8B302b595',
  PrismRouter:   '0x3837455C10d6589F0B64E27458832DEaa348d266',
  USDC:          '0x1f30D01D1766F26e62f8Aa7Dd5703a57E53183A3',
  WETH:          '0x4200000000000000000000000000000000000006',
  PRISM:         '0xCf864db2623735b28BEC4863490e19b13C7B1a5F',
  PoolManager:   '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
  PrismRSC:      '0xd4ae7009f8B60685DEAA1a827670ce5F6Cc8c441',
  poolId:        '0xba158a56ddd8704ba64386fa841a07a7f9d7065db4e314fbdd4b04eac57c936f',
  deployBlock:   54347616,
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
  fee:         3000 as const,
  tickSpacing: 60   as const,
  hooks:       deployments.PrismHook as `0x${string}`,
}
