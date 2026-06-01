// TODO: fill after deployment — run script/Deploy.s.sol and script/DeployRSC.s.sol
const deployments = {
  PrismHook:     '',
  LPYToken:      '',
  LPDToken:      '',
  PrismCallback: '',
  USDC:          '',
  WETH:          '',
  PoolManager:   '',
  deployBlock:   0,
}

export const ADDRESSES = {
  PrismHook:     deployments.PrismHook     as `0x${string}`,
  LPYToken:      deployments.LPYToken      as `0x${string}`,
  LPDToken:      deployments.LPDToken      as `0x${string}`,
  PrismCallback: deployments.PrismCallback as `0x${string}`,
  USDC:          deployments.USDC          as `0x${string}`,
  WETH:          deployments.WETH          as `0x${string}`,
  PoolManager:   deployments.PoolManager   as `0x${string}`,
  deployBlock:   BigInt(deployments.deployBlock ?? 0),
}
