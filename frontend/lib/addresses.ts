// Deployed on Unichain Sepolia — block 53548892
// PrismRSC on Lasna (chain 5318007) — 0xED33027Fb44eAD17f5be78c0bb71F3Dc5189B6f8
const deployments = {
  PrismHook:     '0x98069d76091FdFF316B07a0BeF85Ba8fC79Ac700',
  LPYToken:      '0xa61469Ff39fC06FF1246473595F11513918f82E6',
  LPDToken:      '0x534faDAA4F44BC16559A1E617c5CEa9535398fED',
  PrismCallback: '0x05C5420bD85c0E858B370fD921666328474E36d4',
  PrismRouter:   '0x864B1C2d2123B08AdafF6F13A87fb80022043262',
  USDC:          '0x31d0220469e10c4E71834a79b1f276d740d3768F',
  WETH:          '0x4200000000000000000000000000000000000006',
  PRISM:         '0xEAd14B860fa11e81a2B8348AC3Ea1b401b7C4135',
  PoolManager:   '0x00B036B58a818B1BC34d502D3fE730Db729e62AC',
  deployBlock:   53548892,
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
}
