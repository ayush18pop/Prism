// Deployed on Unichain Sepolia — block 53895363
// Pool: USDC/PRISM, fee=500 (0.05%), tickSpacing=10
// Pool initialized at sqrtPriceX96 = Q96 (tick 0) — 1 PRISM = 1 USDC (both 6 decimals)
const deployments = {
  PrismHook:     '0xB83Ce21DBb0C9105C809510858290eD0da82C700',
  LPYToken:      '0xD2Fd92e7Ef69Dfd0A605d7AEfbb16F9e71Fd7D05',
  LPDToken:      '0xD77841A368ACD5Fd01610D0c8f25081BBf8ff550',
  PrismCallback: '0xAdBCc05DC97c76626e7A2731416745A1CdF98990',
  PrismRouter:   '0x749456188Be970c02dC3C512ecBe1ea53C12262D',
  USDC:          '0x31d0220469e10c4E71834a79b1f276d740d3768F',
  WETH:          '0x4200000000000000000000000000000000000006',
  PRISM:         '0xCf864db2623735b28BEC4863490e19b13C7B1a5F',
  PoolManager:   '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
  PrismRSC:      '0x430e2F332fFe1BC5eFa3C54360fE9aC704EEaff7',
  poolId:        '0xbde6c9ece59c121bd0a4edc4a112d5b7d3416f81db4943dfe1ebc0dddb858208',
  deployBlock:   53895363,
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
