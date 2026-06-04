# Prism Hook

**LP yield without impermanent loss.**

Prism is a Uniswap v4 hook that splits every LP deposit into two separate ERC-1155 tokens,
removing the forced bundling of fee yield and impermanent loss that has always defined LP positions.

> _"Pendle for Uniswap LP positions."_

Built for UHI9 Hookathon · Deployed on Unichain Sepolia · Automated by Reactive Network

---

## The Problem

Every Uniswap LP position bundles two completely different financial products:

- **Yield component** — fee income from swaps. Predictable, desirable, what LPs actually want.
- **Delta component** — impermanent loss exposure. Pure price risk. Nobody wants this.

These have always been inseparable. Prism separates them.

---

## What Prism Does

On every deposit, Prism mints two ERC-1155 tokens:

| Token                  | What It Is                                                    | Who Wants It                        |
| ---------------------- | ------------------------------------------------------------- | ----------------------------------- |
| **LP-Y** (Yield Token) | 100% of swap fees, zero IL exposure                           | Retail LPs, passive yield seekers   |
| **LP-D** (Delta Token) | Absorbs 100% of IL, earns fee share, requires USDC collateral | Protocol treasuries, IL speculators |

An LP who holds both tokens has standard LP exposure — the split is accounting clarity, not added risk.

An LP who sells LP-D immediately holds **pure fee yield with zero IL** — because the delta was bought by a willing counterparty.

### Protocol-Owned LP-D

A protocol treasury can buy LP-D from LPs in their own pool, absorbing IL on their token in exchange for deep, sticky liquidity. No token emissions required. If price holds or reverts, the protocol profits.

```
Old way:  Protocol emits 100,000 TOKEN/week → mercenary LPs farm and dump → emissions are inflationary forever

Prism:    Protocol buys LP-D with USDC → LPs hold LP-Y (zero IL) → protocol absorbs own-token IL
          If price reverts → protocol gets collateral back → net cost = actual IL, not perpetual emissions
```

### Standing Bid (Zero-Friction)

A protocol pre-deposits USDC once via `setStandingBid`. Every subsequent LP deposit automatically has LP-D sold in the same transaction — no second step, no manual negotiation.

---

## Architecture

```
src/
  PrismHook.sol          — Core hook: afterAddLiquidity, before/afterRemoveLiquidity
                           Lazy fee collection via modifyLiquidity(liquidityDelta=0)
                           IL settlement drawing from USDC lpDCollateralVault
                           setStandingBid / cancelStandingBid for auto LP-D sale
  LPYToken.sol           — ERC-1155 yield token; tokenId = positionId
                           Ownership verified via balanceOf at claim time
  LPDToken.sol           — ERC-1155 delta token; same interface as LPYToken
  PrismCallback.sol      — RSC callback receiver on Unichain Sepolia
                           onPriceReversion + onLiquidationThreshold → settleLPD
  lib/
    ILMath.sol           — Oracle-free IL computation (Lipton 2024 funded-LP formula)
    PositionId.sol       — positionId = keccak256(poolId, lp, tickLower, tickUpper, block)

reactive/
  PrismRSC.sol           — AbstractReactive on Lasna (Reactive Network)
                           Subscribes to PositionOpened + Swap events
                           Condition 1: price reversion → settle at profit
                           Condition 3: 90% vault utilisation → force-settle

test/
  PrismHook.t.sol        — 56 tests (all 7 required settlement cases + coverage)
  ILMath.t.sol           — IL formula verification at boundaries
  Tokens.t.sol           — ERC-1155 auth and transfer tests
  PrismCallback.t.sol    — RSC callback authorization tests

script/
  Deploy.s.sol           — 6-step ordered deployment on Unichain Sepolia
  DeployRSC.s.sol        — RSC deployment on Lasna

frontend/               — Next.js 14 + Wagmi v2 + RainbowKit 2 + shadcn/ui
```

---

## Hook Permissions

```
AFTER_ADD_LIQUIDITY_FLAG     = 1 << 10 = 0x0400
BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9  = 0x0200
AFTER_REMOVE_LIQUIDITY_FLAG  = 1 << 8  = 0x0100
Combined mask: 0x0700
```

The hook address encodes these permissions in its lower bits via CREATE2 + HookMiner.

`afterSwap` is **not used** — fees are collected lazily via `modifyLiquidity(liquidityDelta=0)`, not per-swap.

---

## IL Calculation (Oracle-Free)

Based on the funded-LP formula from Lipton, Lucic, Sepp (2024) and the ERLI property from
Tiruviluamala et al. (2022): IL depends only on the price ratio, not absolute levels.

```
ε_funded = sqrtPriceCurrent / sqrtPriceEntry − 1

Since sqrtPriceX96 = sqrt(price) × 2^96:
  sqrtPriceCurrent / sqrtPriceEntry = sqrt(pt / p0)

All results are WAD-scaled. Negative = loss.
```

No external oracle. Fully computable from `StateLibrary.getSlot0`.

```solidity
// ILMath._computeIL
uint256 ratio = (uint256(sqrtPriceCurrent) * WAD) / uint256(sqrtPriceEntry);
int256 ilFraction = int256(ratio) - int256(WAD); // e.g. -0.134e18 for -25% price drop
```

---

## Deployed Contracts

### Unichain Sepolia (Chain ID 1301)

| Contract        | Address                                                              |
| --------------- | -------------------------------------------------------------------- |
| PrismHook       | `0x12be5F9664F2eB1b74f72e9B9f3054d2eB434700`                         |
| LPYToken        | `0x80aa616eDb2e333c804B125A17167C8236036eE0`                         |
| LPDToken        | `0x5f214AD25318F1bcfb8cE7B25e91f2619669307C`                         |
| PrismCallback   | `0xBf662f9A4aC6a002C9870d2Ac48993757240bb1f`                         |
| PrismRouter     | `0xE49e87998303924b0cBeC062E0FdE1b6A998420E`                         |
| USDC (MockUSDC) | `0x31d0220469e10c4E71834a79b1f276d740d3768F`                         |
| WETH            | `0x4200000000000000000000000000000000000006`                         |
| PoolManager     | `0x00B036B58a818B1BC34d502D3fE730Db729e62AC`                         |
| Pool ID         | `0x52dc643d94a3935ae3a7e2dd8a231756ed96740c07e928192725ac749c1f81b4` |
| Deploy Block    | `53622081`                                                           |

### Lasna Testnet (Reactive Network, Chain ID 5318007)

| Contract | Address                                      |
| -------- | -------------------------------------------- |
| PrismRSC | `0x7F6e422f3184CBa32b655147C7233CdD007552A2` |

---

## Quick Start

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Clone repo
git clone <repo-url>
cd Prism
forge install
```

### Build & Test

```bash
cd Prism
forge build
forge test -vvv                                    # run all 56 tests
forge test --match-test test_settlementCase2 -vvv  # specific test
forge coverage --ir-minimum                        # coverage report (requires --ir-minimum for via_ir)
```

### Deploy (Unichain Sepolia)

**Step 1 — Set environment variables:**

```bash
cp .env.example .env
# Edit .env:
# PRIVATE_KEY=0x...
# DEPLOYER_ADDRESS=0x...
# POOL_MANAGER_ADDRESS=0x00B036B58a818B1BC34d502D3fE730Db729e62AC
# WETH_ADDRESS=0x4200000000000000000000000000000000000006
# USDC_ADDRESS=              (omit to auto-deploy MockUSDC)
```

**Step 2 — Deploy core contracts:**

```bash
forge script script/Deploy.s.sol \
  --rpc-url unichain_sepolia \
  --broadcast --verify
```

Fill in `deployments/unichain-sepolia.json` with the printed addresses.

**Step 3 — Deploy RSC on Lasna:**

```bash
export CALLBACK_CONTRACT=<PrismCallback address from step 2>
export PRISM_HOOK_ADDRESS=<PrismHook address from step 2>
export WATCHED_POOL_ID=<poolId from step 2>

forge script script/DeployRSC.s.sol \
  --rpc-url lasna \
  --broadcast
```

**Step 4 — Wire callback (must happen after RSC deploy):**

```bash
cast send $CALLBACK_CONTRACT \
  "setAuthorizedRSC(address)" $RSC_ADDRESS \
  --rpc-url unichain_sepolia --private-key $PRIVATE_KEY

cast send $PRISM_HOOK_ADDRESS \
  "setCallbackContract(address)" $CALLBACK_CONTRACT \
  --rpc-url unichain_sepolia --private-key $PRIVATE_KEY
```

**Step 5 — Verify:**

```bash
cast call $PRISM_HOOK_ADDRESS "callbackContract()" --rpc-url unichain_sepolia
# Should return PrismCallback address
```

> **Order matters.** PrismRSC must be deployed before any LP deposits. Positions opened before RSC deployment are invisible to it — the RSC tracks positions via `PositionOpened` events.

---

## API Reference

### LP-Y Holder Functions

```solidity
// Collect swap fees (whoever holds LP-Y at call time receives fees)
function claimFees(PoolKey calldata key, bytes32 posId) external

// Collect IL compensation staged after LP-D settlement
function claimILCompensation(bytes32 posId) external
```

### LP-D Holder Functions

```solidity
// Manually purchase LP-D (if not auto-filled by standing bid)
function purchaseLPD(bytes32 posId, uint256 collateralAmount, uint256 feeShareBpsLPD) external

// Settle LP-D position (voluntary or forced by callback)
function settleLPD(bytes32 posId) external

// Claim remaining collateral post-settlement
function claimLPDCollateral(bytes32 posId) external

// Claim staged fee share
function claimFeesLPD(PoolKey calldata key, bytes32 posId) external
```

### Protocol / Standing Bid Functions

```solidity
// Pre-deposit USDC to auto-fill LP-D on every deposit
// pricePerUnit: WAD coverage fraction (1e18 = 100% IL coverage)
// feeShareBpsLPD: ongoing fee share for LP-D holder (0-10000 bps)
// maxCollateral: total USDC to pre-deposit
function setStandingBid(bytes32 poolId, uint256 pricePerUnit, uint256 feeShareBpsLPD, uint256 maxCollateral) external

// Cancel bid and refund unspent USDC
function cancelStandingBid(bytes32 poolId) external
```

### Key Events

```solidity
event PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 collateral);
event LPDAutoPurchased(bytes32 indexed posId, address buyer, uint256 usdcCost, uint256 feeShareBpsLPD);
event LPDSettled(bytes32 indexed posId, uint256 ilCost, uint256 refundedToHolder);
event LPDLiquidated(bytes32 indexed posId, uint256 collateralConsumed);
event FeesClaimed(bytes32 indexed posId, address recipient, uint256 fees0, uint256 fees1);
event ILCompensationClaimed(bytes32 indexed posId, address recipient, uint256 usdc);
event StandingBidSet(bytes32 indexed poolId, address bidder, uint256 pricePerUnit, uint256 feeShareBpsLPD, uint256 maxCollateral);
```

### positionId Formula

```solidity
bytes32 posId = keccak256(abi.encodePacked(
    poolId,        // bytes32
    lpAddress,     // address
    tickLower,     // int24
    tickUpper,     // int24
    block.number   // uint256 — prevents same-range collision across blocks
));
```

---

## Data Structures

```solidity
struct Position {
    bytes32  poolId;
    uint160  entrySqrtPrice;
    int24    tickLower;
    int24    tickUpper;
    uint128  liquidity;
    address  lpDHolder;       // current LP-D holder
    uint256  feeShareBpsLPD;  // fee split locked at sale (0 = 100% to LP-Y)
    bool     lpDSold;
    bool     settled;
}

struct StandingBid {
    address  bidder;
    uint256  pricePerUnit;    // WAD coverage fraction
    uint256  feeShareBpsLPD;  // LP-D fee share offered (0–10000 bps)
    uint256  maxCollateral;   // total USDC pre-deposited
    uint256  usedCollateral;  // USDC allocated to filled bids
    bool     active;
}
```

---

## Settlement Cases

### Case 1 — LP holds both tokens

LP deposits and never sells either token. Exit is identical to a standard LP: principal + fees + net IL. No USDC collateral involved.

### Case 2 — LP sold LP-D, holds only LP-Y

LP exits. `beforeRemoveLiquidity` computes current IL and draws proportionally from the collateral vault into `lpYCompensation[posId]`. LP receives full principal + fees. IL is compensated from USDC. LP-D holder claims remaining collateral via `claimLPDCollateral`.

### Case 3 — RSC force-settle

Reactive Network RSC detects that IL has consumed ≥ 90% of the collateral vault. Fires `onLiquidationThreshold(posId)` → `PrismCallback` → `hook.settleLPD(posId)`. LP-Y holder is protected before full depletion.

---

## Reactive Network (RSC)

`PrismRSC` on Lasna subscribes to two event streams from Unichain Sepolia:

1. **`PositionOpened`** — registers new LP-D positions into `trackedPositions[]`
2. **`Swap`** — on every swap, evaluates all active positions against two conditions

**Condition 1 (Price Reversion):** sqrtPrice returns within 1% of entry → fires `onPriceReversion` → collateral returned to LP-D holder.

**Condition 3 (Liquidation Threshold):** computed IL ≥ 90% of vault → fires `onLiquidationThreshold` → force-settle before full depletion.

```
RSC constants:
  REVERSION_BPS    = 100   (1%)
  LIQUIDATION_BPS  = 9000  (90%)
```

---

## Frontend

The frontend is a Next.js 14 app located in `Prism/frontend/`.

### Stack

- Next.js 14 App Router
- Wagmi v2 + TanStack Query v5
- RainbowKit 2
- shadcn/ui
- viem 2.x

### Setup

```bash
cd Prism/frontend
cp .env.example .env.local
# Required:
# NEXT_PUBLIC_CHAIN_ID=1301
# NEXT_PUBLIC_RPC_URL=https://sepolia.unichain.org
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<from walletconnect.com>

npm install
npm run dev
```

### Contract Reads

```typescript
import { useReadContract } from "wagmi";

const { data: position } = useReadContract({
  address: ADDRESSES.PrismHook,
  abi: PRISM_HOOK_ABI,
  functionName: "positions",
  args: [posId],
  chainId: 1301,
});
```

### Setting a Standing Bid

```typescript
import { useWriteContract } from "wagmi";
import { parseUnits } from "viem";

const { writeContractAsync } = useWriteContract();

// 1. Approve USDC
await writeContractAsync({
  address: ADDRESSES.USDC,
  abi: ERC20_ABI,
  functionName: "approve",
  args: [ADDRESSES.PrismHook, parseUnits("1000", 6)],
  chainId: 1301,
});

// 2. Set bid
// pricePerUnit = 0.5e18 means: willing to cover 50% of position value as IL
// feeShareBpsLPD = 3000 means: LP-D holder earns 30% of swap fees
await writeContractAsync({
  address: ADDRESSES.PrismHook,
  abi: PRISM_HOOK_ABI,
  functionName: "setStandingBid",
  args: [poolId, parseUnits("0.5", 18), 3000n, parseUnits("1000", 6)],
  chainId: 1301,
});
```

### Querying Positions

```typescript
import { parseAbiItem } from "viem";

const POSITION_OPENED = parseAbiItem(
  "event PositionOpened(bytes32 indexed posId, uint160 entrySqrtPrice, int24 tickLower, int24 tickUpper, uint256 collateral)",
);

const logs = await publicClient.getLogs({
  address: ADDRESSES.PrismHook,
  event: POSITION_OPENED,
  fromBlock: ADDRESSES.deployBlock,
  toBlock: "latest",
});
```

---

## Security

### Critical Invariants

1. **CEI order is mandatory.** Every settlement function zeros vault storage before any token transfer. See `settleLPD` and `claimILCompensation` for the pattern.
2. **LP-Y ownership at claim time.** `lpYHolder` is never stored in `Position`. Compensation and fees go to whoever holds the ERC-1155 at the moment of claim — correctly follows secondary transfers.
3. **`authorizedRSC` is set-once.** `setAuthorizedRSC` reverts with `AlreadySet` on subsequent calls. Same for `setCallbackContract` on the hook.
4. **Collateral adequacy check.** `setStandingBid` auto-fill only executes when `pricePerUnit >= maxIL` for the deposited range. Under-collateralised bids are silently skipped — the LP retains LP-D.
5. **`nonReentrant` on all USDC transfers.** `claimFees`, `settleLPD`, `claimILCompensation`, `claimLPDCollateral`, `purchaseLPD` all guard against reentrancy.
6. **`positionId` uses `block.number`.** Prevents cross-block collision for same LP in same range.
7. **`afterSwap` is not registered.** Fees collected lazily — no per-swap O(n) overhead.

### Authorization Table

| Function                         | Required Guard                              |
| -------------------------------- | ------------------------------------------- |
| `claimFees`                      | `lpYToken.balanceOf(msg.sender, posId) > 0` |
| `claimILCompensation`            | `lpYToken.balanceOf(msg.sender, posId) > 0` |
| `settleLPD` (voluntary)          | `pos.lpDHolder == msg.sender`               |
| `settleLPD` (forced)             | `msg.sender == callbackContract`            |
| `claimLPDCollateral`             | `pos.lpDHolder == msg.sender`               |
| `claimFeesLPD`                   | `pos.lpDHolder == msg.sender`               |
| `PrismCallback.onPriceReversion` | `msg.sender == authorizedRSC`               |
| `setCallbackContract`            | `onlyOwner`, callable once                  |

---

## Test Coverage

```
File                   Lines      Branches    Functions
------------------------------------------------------
src/PrismHook.sol      90.48%     72.97%      100% (24/24)
src/PrismCallback.sol  100%       100%        100%
src/LPYToken.sol       100%       100%        100%
src/lib/ILMath.sol     100%       100%        100%
src/lib/PositionId.sol 100%       100%        100%
```

All 7 required settlement scenarios are tested:

1. `test_settlementCase1_bothHeld_standardExit`
2. `test_settlementCase2_lpDSold_ilDrawnFromCollateral`
3. `test_settlementCase3_rscForced_collateralLiquidated`
4. `test_standingBid_adequate_autoFills`
5. `test_standingBid_insufficient_silentSkip`
6. `test_claimILComp_afterLpYTransfer_newHolderReceives`
7. `test_posId_sameRangeTwoBlocks_differentIds`

---

## Honest Limitations

**LP-D has no automatic price discovery at launch.** The standing bid mechanism allows competitive bidding (one bid per pool, winner-takes-slot), but requires a willing protocol treasury as the first buyer. Cold-start path: the protocol is its own first LP and LP-D buyer.

**v1 targets stablecoin-paired pools.** Prism v1 is designed for token/USDC pairs (ETH/USDC, TOKEN/USDC). Collateral is always USDC. Volatile/volatile pairs (ETH/WBTC) require a different collateral model — explicitly out of scope.

**LVR is not addressed.** LP-Y holders are protected from impermanent loss (reversible). Loss-Versus-Rebalancing from arb bots (irreversible) is a separate, unaddressed problem.

**Standing bid is winner-takes-slot.** One active bid per pool in v1. A competitor displaces the incumbent by setting a new bid; the previous bidder is automatically refunded. Multi-bidder priority queue is v2 scope.

---

## Academic References

1. Aigner, A., Dhaliwal, G. (2021). _Uniswap: Impermanent Loss and Risk Profile of a Liquidity Provider._ arXiv:2106.14404
2. Tiruviluamala, N. et al. (2022). _Impermanent Loss in Uniswap: A General Framework._ arXiv:2203.11352
3. Lipton, A., Lucic, V., Sepp, A. (2024). _Unified Approach to Hedging Impermanent Loss._ arXiv:2407.05146
4. Fukasawa, M., Maire, B., Wunsch, M. (2023). _Weighted Variance Swaps Hedge Against Impermanent Loss._ SSRN
5. Vlasov, A. et al. (2025). _Impermanent Gain: The Impact of Exchange Fees on LP Returns._ arXiv:138648
6. Kim et al. (2024). _A Comparison of Impermanent Loss for Various CFMMs._ IEEE

---

## Tech Stack

| Layer           | Technology                                                  |
| --------------- | ----------------------------------------------------------- |
| Smart Contracts | Solidity 0.8.26, Foundry                                    |
| Hook Framework  | Uniswap v4-core, v4-periphery                               |
| Token Standard  | ERC-1155 (OpenZeppelin)                                     |
| Automation      | Reactive Network (AbstractReactive RSC, Lasna testnet)      |
| Network         | Unichain Sepolia (Chain ID 1301), ~1s blocks, sub-cent gas  |
| Frontend        | Next.js 14, Wagmi v2, RainbowKit 2, viem, TanStack Query v5 |

---

## License

MIT
