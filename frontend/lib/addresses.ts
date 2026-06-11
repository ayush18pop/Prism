// Deployed on Unichain Sepolia — block 54330200
// Pool: USDC/PRISM, fee=3000 (0.30%), tickSpacing=60
// PrismCallback authorized sender: 0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4 (Reactive proxy)
const deployments = {
  PrismHook:     '0x1cB5414b574B0656106B45B2e6041d8b49888700',
  LPYToken:      '0x6C0a9eb9D33E332166Aa9C44a9707D9970dB2d32',
  LPDToken:      '0xD16054C70838f4ec19a56dF6147C961B357FC7DD',
  PrismCallback: '0xbe8C73ab1C3C7F85630f1a9a72208d63dd89a141',
  PrismRouter:   '0xF80B02D03318386b9f11cf4B2b38724451D37215',
  USDC:          '0x1f30D01D1766F26e62f8Aa7Dd5703a57E53183A3',
  WETH:          '0x4200000000000000000000000000000000000006',
  PRISM:         '0xCf864db2623735b28BEC4863490e19b13C7B1a5F',
  PoolManager:   '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
  PrismRSC:      '0xc1d8ef36eB9b741524A5F5F1B20C16AE040ffF03',
  poolId:        '0x86b55a7698f75fab1b711dfbbb76a598426296b2218abd38c10b2dae2f98e4f0',
  deployBlock:   54330200,
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
