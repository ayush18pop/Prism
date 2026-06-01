// TODO: run `forge build` in Prism/ to generate out/ before importing
// These are placeholder ABIs until the contracts are compiled and deployed.
// Updated for Phase 3.5.5: feeShareBpsLPD added to setStandingBid, purchaseLPD, claimFeesLPD added.

const POOL_KEY_COMPONENTS = [
  { name: 'currency0',   type: 'address' },
  { name: 'currency1',   type: 'address' },
  { name: 'fee',         type: 'uint24'  },
  { name: 'tickSpacing', type: 'int24'   },
  { name: 'hooks',       type: 'address' },
] as const

export const PRISM_HOOK_ABI = [
  // reads
  { name: 'getPosition', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'posId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'poolId',          type: 'bytes32'  },
      { name: 'entrySqrtPrice',  type: 'uint160'  },
      { name: 'tickLower',       type: 'int24'    },
      { name: 'tickUpper',       type: 'int24'    },
      { name: 'liquidity',       type: 'uint128'  },
      { name: 'lpDHolder',       type: 'address'  },
      { name: 'feeShareBpsLPD',  type: 'uint256'  },
      { name: 'lpDSold',         type: 'bool'     },
      { name: 'settled',         type: 'bool'     },
    ] }] },
  { name: 'lpDCollateralVault',  type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'lpYCompensation',     type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'lpDClaimable',        type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'lpDFeesClaimable',    type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }] },
  { name: 'standingBids', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'bidder',          type: 'address' },
      { name: 'pricePerUnit',    type: 'uint256' },
      { name: 'feeShareBpsLPD',  type: 'uint256' },
      { name: 'maxCollateral',   type: 'uint256' },
      { name: 'usedCollateral',  type: 'uint256' },
      { name: 'active',          type: 'bool'    },
    ] }] },
  // writes
  { name: 'setStandingBid', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId',         type: 'bytes32' },
      { name: 'pricePerUnit',   type: 'uint256' },
      { name: 'feeShareBpsLPD', type: 'uint256' },
      { name: 'maxCollateral',  type: 'uint256' },
    ], outputs: [] },
  { name: 'cancelStandingBid', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'poolId', type: 'bytes32' }], outputs: [] },
  { name: 'purchaseLPD', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'posId',            type: 'bytes32' },
      { name: 'collateralAmount', type: 'uint256' },
      { name: 'feeShareBpsLPD',   type: 'uint256' },
    ], outputs: [] },
  { name: 'settleLPD',          type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [] },
  { name: 'claimILCompensation',type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [] },
  { name: 'claimLPDCollateral', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [] },
  { name: 'claimFees',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'key', type: 'tuple', components: POOL_KEY_COMPONENTS }, { name: 'posId', type: 'bytes32' }], outputs: [] },
  { name: 'claimFeesLPD', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'key', type: 'tuple', components: POOL_KEY_COMPONENTS }, { name: 'posId', type: 'bytes32' }], outputs: [] },
  // events
  { name: 'PositionOpened',   type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'entrySqrtPrice', type: 'uint160', indexed: false }, { name: 'tickLower', type: 'int24', indexed: false }, { name: 'tickUpper', type: 'int24', indexed: false }, { name: 'collateral', type: 'uint256', indexed: false }] },
  { name: 'LPDAutoPurchased', type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'buyer', type: 'address', indexed: false }, { name: 'usdcCost', type: 'uint256', indexed: false }, { name: 'feeShareBpsLPD', type: 'uint256', indexed: false }] },
  { name: 'LPDSettled',       type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'ilCost', type: 'uint256', indexed: false }, { name: 'refundedToHolder', type: 'uint256', indexed: false }] },
  { name: 'LPDLiquidated',    type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'collateralConsumed', type: 'uint256', indexed: false }] },
  { name: 'FeesClaimed',      type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: false }, { name: 'fees0', type: 'uint256', indexed: false }, { name: 'fees1', type: 'uint256', indexed: false }] },
  { name: 'LPDFeesClaimed',   type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: false }, { name: 'amount0', type: 'uint256', indexed: false }, { name: 'amount1', type: 'uint256', indexed: false }] },
  { name: 'ILCompensationClaimed', type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: false }, { name: 'usdc', type: 'uint256', indexed: false }] },
  { name: 'StandingBidSet',   type: 'event', inputs: [{ name: 'poolId', type: 'bytes32', indexed: true }, { name: 'bidder', type: 'address', indexed: false }, { name: 'pricePerUnit', type: 'uint256', indexed: false }, { name: 'feeShareBpsLPD', type: 'uint256', indexed: false }, { name: 'maxCollateral', type: 'uint256', indexed: false }] },
  { name: 'StandingBidCancelled', type: 'event', inputs: [{ name: 'poolId', type: 'bytes32', indexed: true }, { name: 'bidder', type: 'address', indexed: false }, { name: 'refunded', type: 'uint256', indexed: false }] },
] as const

export const ERC1155_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
] as const

export const ERC20_ABI = [
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const
