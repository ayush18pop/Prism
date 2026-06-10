// Updated for Phase 3.6: order book (postBid/cancelBid), ilCoverageBps on Position

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
      { name: 'ilCoverageBps',   type: 'uint256'  },
      { name: 'maxIL',           type: 'uint128'  },
      { name: 'lpDSold',         type: 'bool'     },
      { name: 'settled',         type: 'bool'     },
    ] }] },
  { name: 'lpDCollateralVault',  type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'lpYCompensation',     type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'lpDClaimable',        type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'lpDFeesClaimable',    type: 'function', stateMutability: 'view', inputs: [{ name: 'posId', type: 'bytes32' }], outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }] },
  { name: 'bids', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }, { name: 'bidId', type: 'uint256' }],
    outputs: [{ name: '', type: 'tuple', components: [
      { name: 'bidder',          type: 'address' },
      { name: 'pricePerUnit',    type: 'uint256' },
      { name: 'feeShareBpsLPD',  type: 'uint256' },
      { name: 'ilCoverageBps',   type: 'uint256' },
      { name: 'maxCollateral',   type: 'uint256' },
      { name: 'usedCollateral',  type: 'uint256' },
      { name: 'active',          type: 'bool'    },
    ] }] },
  { name: 'nextBidId', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  // writes
  { name: 'postBid', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'poolId',         type: 'bytes32' },
      { name: 'pricePerUnit',   type: 'uint256' },
      { name: 'feeShareBpsLPD', type: 'uint256' },
      { name: 'ilCoverageBps',  type: 'uint256' },
      { name: 'maxCollateral',  type: 'uint256' },
    ], outputs: [{ name: 'bidId', type: 'uint256' }] },
  { name: 'cancelBid', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'poolId', type: 'bytes32' }, { name: 'bidId', type: 'uint256' }], outputs: [] },
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
  { name: 'PositionOpened',   type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'entrySqrtPrice', type: 'uint160', indexed: false }, { name: 'tickLower', type: 'int24', indexed: false }, { name: 'tickUpper', type: 'int24', indexed: false }, { name: 'ilCoverageBps', type: 'uint256', indexed: false }, { name: 'collateral', type: 'uint256', indexed: false }] },
  { name: 'LPDAutoPurchased', type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'buyer', type: 'address', indexed: false }, { name: 'usdcCost', type: 'uint256', indexed: false }, { name: 'feeShareBpsLPD', type: 'uint256', indexed: false }] },
  { name: 'LPDSettled',       type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'ilCost', type: 'uint256', indexed: false }, { name: 'refundedToHolder', type: 'uint256', indexed: false }] },
  { name: 'LPDLiquidated',    type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'collateralConsumed', type: 'uint256', indexed: false }] },
  { name: 'FeesClaimed',      type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: false }, { name: 'fees0', type: 'uint256', indexed: false }, { name: 'fees1', type: 'uint256', indexed: false }] },
  { name: 'LPDFeesClaimed',   type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: false }, { name: 'amount0', type: 'uint256', indexed: false }, { name: 'amount1', type: 'uint256', indexed: false }] },
  { name: 'ILCompensationClaimed', type: 'event', inputs: [{ name: 'posId', type: 'bytes32', indexed: true }, { name: 'recipient', type: 'address', indexed: false }, { name: 'usdc', type: 'uint256', indexed: false }] },
  { name: 'StandingBidSet',   type: 'event', inputs: [{ name: 'poolId', type: 'bytes32', indexed: true }, { name: 'bidder', type: 'address', indexed: false }, { name: 'pricePerUnit', type: 'uint256', indexed: false }, { name: 'feeShareBpsLPD', type: 'uint256', indexed: false }, { name: 'maxCollateral', type: 'uint256', indexed: false }] },
  { name: 'StandingBidCancelled', type: 'event', inputs: [{ name: 'poolId', type: 'bytes32', indexed: true }, { name: 'bidder', type: 'address', indexed: false }, { name: 'refunded', type: 'uint256', indexed: false }] },
  // Order book events (Phase 3.6)
  { name: 'BidPosted', type: 'event', inputs: [
    { name: 'poolId',         type: 'bytes32', indexed: true  },
    { name: 'bidId',          type: 'uint256', indexed: false },
    { name: 'bidder',         type: 'address', indexed: false },
    { name: 'pricePerUnit',   type: 'uint256', indexed: false },
    { name: 'feeShareBpsLPD', type: 'uint256', indexed: false },
    { name: 'ilCoverageBps',  type: 'uint256', indexed: false },
    { name: 'maxCollateral',  type: 'uint256', indexed: false },
  ] },
  { name: 'BidCancelled', type: 'event', inputs: [
    { name: 'poolId',   type: 'bytes32', indexed: true  },
    { name: 'bidId',    type: 'uint256', indexed: false },
    { name: 'bidder',   type: 'address', indexed: false },
    { name: 'refunded', type: 'uint256', indexed: false },
  ] },
  { name: 'BidFilled', type: 'event', inputs: [
    { name: 'posId',          type: 'bytes32', indexed: true  },
    { name: 'bidId',          type: 'uint256', indexed: false },
    { name: 'buyer',          type: 'address', indexed: false },
    { name: 'usdcCost',       type: 'uint256', indexed: false },
    { name: 'feeShareBpsLPD', type: 'uint256', indexed: false },
    { name: 'ilCoverageBps',  type: 'uint256', indexed: false },
  ] },
] as const

export const ERC1155_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'safeTransferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'id', type: 'uint256' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] },
] as const

export const PRISM_ROUTER_ABI = [
  { name: 'addLiquidity', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'key', type: 'tuple', components: [
        { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
      ]},
      { name: 'params', type: 'tuple', components: [
        { name: 'tickLower', type: 'int24' }, { name: 'tickUpper', type: 'int24' },
        { name: 'liquidityDelta', type: 'int256' }, { name: 'salt', type: 'bytes32' },
      ]},
    ], outputs: [] },
  { name: 'removeLiquidity', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'key', type: 'tuple', components: [
        { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
      ]},
      { name: 'params', type: 'tuple', components: [
        { name: 'tickLower', type: 'int24' }, { name: 'tickUpper', type: 'int24' },
        { name: 'liquidityDelta', type: 'int256' }, { name: 'salt', type: 'bytes32' },
      ]},
      { name: 'posId', type: 'bytes32' },
    ], outputs: [] },
  { name: 'swap', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'key', type: 'tuple', components: [
        { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
      ]},
      { name: 'zeroForOne', type: 'bool' },
      { name: 'amountSpecified', type: 'int256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' },
    ], outputs: [] },
  { name: 'claimFees', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'key', type: 'tuple', components: [
        { name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' },
      ]},
      { name: 'posId', type: 'bytes32' },
      { name: 'hook', type: 'address' },
    ], outputs: [] },
] as const

// PoolManager StateLibrary — extsload-based getSlot0
export const POOL_MANAGER_ABI = [
  { name: 'getSlot0', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick',         type: 'int24'   },
      { name: 'protocolFee', type: 'uint24'   },
      { name: 'lpFee',        type: 'uint24'   },
    ] },
] as const

export const ERC20_ABI = [
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const
