# Prism — Implementation Plan
**Demo Day: June 19 2026 | Updated: May 31 2026 | 19 days remaining**

Update this file as items complete. The `project-manager` agent reads it to assess status.

---

## Phase 0 — Project Setup ✅ COMPLETE
- [x] `foundry.toml` with `unichain_sepolia` + `lasna` RPC URLs
- [x] `remappings.txt` for `@uniswap/v4-core`, `@uniswap/v4-periphery`, `@openzeppelin`, `@reactive-network`
- [x] `forge install` for all deps (v4-core, v4-periphery, openzeppelin-contracts, forge-std, reactive-lib)
- [x] `forge build` passing

## Phase 1 — Libraries ✅ COMPLETE
- [x] `src/lib/PositionId.sol` — keccak256(poolId || lpAddress || tickLower || tickUpper || depositBlock)
- [x] `src/lib/ILMath.sol` — `_computeIL`, `_computeMaxIL` (WAD-scaled, oracle-free, Lipton 2024 funded LP formula)
- [x] `test/ILMath.t.sol` — verified at 0%, ±25%, both tick boundaries (9 tests passing)

## Phase 2 — Token Contracts ✅ COMPLETE
- [x] `src/LPYToken.sol` — ERC-1155, `setHook`, `mint` via `_update` (no ERC1155Receiver check)
- [x] `src/LPDToken.sol` — ERC-1155, same interface
- [x] `test/Tokens.t.sol` — mint auth, transfer, balanceOf (8 tests passing)

## Phase 3 — PrismHook ✅ COMPLETE (23/23 tests passing)
- [x] `src/PrismHook.sol` scaffold — BaseHook, permissions `0x0700`, all data structures
- [x] `afterAddLiquidity` — posId derivation, LP-Y/LP-D mint, standing bid auto-fill, PositionOpened emit
- [x] `claimFees` — lazy modifyLiquidity(liquidityDelta=0), LP-Y holder guard
- [x] `beforeRemoveLiquidity` — IL computation (ILMath._computeIL), proportional vault draw, lpYCompensation staged
- [x] `afterRemoveLiquidity` — settled=true, activePos cleanup
- [x] `claimILCompensation` — CEI, balanceOf guard at claim time (follows LP-Y token ownership)
- [x] `setStandingBid` — USDC transferFrom, pricePerUnit is WAD coverage fraction
- [x] `cancelStandingBid` — refund unspent, idempotent active=false
- [x] `purchaseLPD` — adequacy check, USDC transferFrom, LP-D safeTransfer from depositor
- [x] `settleLPD` — voluntary (lpDHolder) + forced (callbackContract), CEI, proportional IL draw
- [x] `claimLPDCollateral` — guard lpDHolder==msg.sender, CEI

## Phase 3 — Tests ✅ ALL 7 REQUIRED PASSING
- [x] `test_deposit_noStandingBid_mintsBothTokens` (via `test_standingBid_insufficient_silentSkip`)
- [x] `test_settlementCase1_bothHeld_standardExit`
- [x] `test_settlementCase2_lpDSold_ilDrawnFromCollateral` ← money shot
- [x] `test_settlementCase3_rscForced_collateralLiquidated`
- [x] `test_standingBid_adequate_autoFills`
- [x] `test_standingBid_insufficient_silentSkip`
- [x] `test_claimILComp_afterLpYTransfer_newHolderReceives`
- [x] `test_posId_sameRangeTwoBlocks_differentIds`

## Phase 3.5.5 — Market-Driven Fee Split ✅ COMPLETE
*Design decision: `feeShareBpsLPD` is embedded in each standing bid (not a global constant).
It is locked per-position at LP-D sale time. LP-D holders earn their share via pull
(`claimFeesLPD`); LP-Y share is unchanged in `claimFees`. See spec.md §Fee Routing and
whitepaper §6.3 for the full design rationale.*

**Solidity changes — `Prism/src/PrismHook.sol`:**
- [x] Add `feeShareBpsLPD` field to `StandingBid` struct
- [x] Add `feeShareBpsLPD` field to `Position` struct (0 when LP holds both tokens)
- [x] Add `FeeShares` struct and `lpDFeesClaimable[posId]` mapping
- [x] Add `InvalidFeeShare(uint256 value)` custom error
- [x] Add `LPDFeesClaimed(bytes32 indexed posId, address recipient, uint256 amount0, uint256 amount1)` event
- [x] Update `setStandingBid(poolId, pricePerUnit, feeShareBpsLPD, maxCollateral)` — add param + validate `<= 10000`
- [x] Update `purchaseLPD(posId, collateralAmount, feeShareBpsLPD)` — add param + validate (fixed dimensional bug: check `> 0` not WAD vs USDC)
- [x] Update `afterAddLiquidity` standing bid fill block — store `bid.feeShareBpsLPD` in `positions[posId]`
- [x] Update `StandingBidSet` event — add `feeShareBpsLPD` param
- [x] Update `LPDAutoPurchased` event — add `feeShareBpsLPD` param
- [x] Update `claimFees` — split `fees0`/`fees1` by `pos.feeShareBpsLPD`; stage LP-D share in `lpDFeesClaimable[posId]`
- [x] Add `claimFeesLPD(key, posId)` — LP-D holder pulls staged share; CEI; `nonReentrant`; guard: `pos.lpDHolder == msg.sender`
- [x] Update `FeesClaimed` event signature (LP-Y amounts only; LP-D staged amounts in `LPDFeesClaimed`)
- Note: `claimFees` calls `poolManager.modifyLiquidity` — requires unlock context in v4. In tests,
  fees are injected via vm.store (slot 7 = lpDFeesClaimable). Production router must be position owner.

**Tests — `Prism/test/PrismHook.t.sol`:** ✅ ALL 7 PASSING (30/30 total)
- [x] `test_claimFees_withSplit_lpYReceivesCorrectShare` — phi=3000, verifies 70/30 split math + LP-D pull
- [x] `test_claimFeesLPD_afterClaimFees_lpDReceivesShare` — inject both currencies, bidder claims both, idempotent
- [x] `test_claimFeesLPD_beforeClaimFees_zeroBalance` — NoFeesClaimable revert when nothing staged
- [x] `test_standingBid_feeShareLockedAtFill_bidUpdateNoEffect` — phi frozen at auto-fill; bid replacement doesn't mutate
- [x] `test_purchaseLPD_customFeeShare` — OTC purchase with phi=7000, modifyRouter approval required
- [x] `test_setStandingBid_invalidFeeShare_reverts` — > 10000 bps reverts; 10000 accepted
- [x] `test_claimFees_noLPDSold_allFeesToLPY` — phi=0 confirmed; NoFeesClaimable for LP-D holder

**Frontend changes:**
- [x] `components/lpd/StandingBidForm.tsx` — add `feeShareBps` number input (0–10000, display as %)
- [x] `components/position/ClaimPanel.tsx` — add `claimFeesLPD` button visible to LP-D holder
- [x] `hooks/usePrismHook.ts` — add `useClaimFeesLPD` write hook + `useLPDFeesClaimable` read hook
- [x] `lib/abis.ts` — updated with new function sigs + events (hand-written; forge build blocked on deployment)
- [x] `components/position/PositionCard.tsx` — pass `poolKey` + `lpDFees` to ClaimPanel (build passing)

## Phase 3.5 — Frontend ✅ COMPLETE (npm run build passing)
- [x] `Prism/frontend/` — Next.js 14 App Router + Wagmi v2 + RainbowKit 2 + shadcn/ui
- [x] `lib/chains.ts` — unichainSepolia (ID 1301) defined
- [x] `lib/abis.ts` — PrismHook, ERC1155, ERC20 ABIs (hand-written; import from out/ post-deploy)
- [x] `lib/addresses.ts` — stub with TODO; update after deployment
- [x] `lib/wagmi.ts` — getDefaultConfig with unichainSepolia
- [x] `lib/ilMath.ts` — client-side sqrtPriceX96ToPrice, computeILFraction
- [x] `app/providers.tsx` — WagmiProvider + QueryClientProvider + RainbowKitProvider
- [x] `app/layout.tsx` — dark mode, Inter/JetBrains Mono, Providers
- [x] `app/page.tsx` — demo page: hero, PoolStats, StandingBidForm, positions list, RSC indicator
- [x] `components/layout/Header.tsx` — ConnectButton, sticky header
- [x] `components/pool/PoolStats.tsx` — live sqrtPriceX96 / tick / ETH price
- [x] `components/lpd/StandingBidForm.tsx` — approve USDC → setStandingBid flow
- [x] `components/position/PositionCard.tsx` — LP-Y/LP-D balances, IL badge, settlement status
- [x] `components/position/ClaimPanel.tsx` — claimILCompensation / claimLPDCollateral / settleLPD
- [x] `components/position/ILStatusBadge.tsx` — colour-coded IL% badge
- [x] `hooks/usePrismHook.ts` — wagmi read/write hooks + PositionOpened log query
- [ ] `/deposit` page — DepositForm with tick range + IL preview (nice-to-have; demo uses Uniswap UI)
- [ ] `/demo` page — step-by-step overlay with fallback video (add during demo staging)
- [ ] Fill `lib/addresses.ts` + `DEMO_POOL_ID` in `page.tsx` after deployment

## Phase 4 — Reactive Network ✅ COMPLETE
- [x] `src/PrismCallback.sol` — `authorizedRSC` immutable, `onPriceReversion`, `onLiquidationThreshold`
- [x] `reactive/PrismRSC.sol` — AbstractReactive, subscribes PositionOpened + Swap, Condition 1 + 3

## Phase 5 — Deployment 🔴 BLOCKED (needs funded wallets + RPC env vars)
- [x] `script/Deploy.s.sol` — 6-step ordered deployment written
- [x] `script/DeployRSC.s.sol` — RSC on Lasna written
- [x] `deployments/unichain-sepolia.json` — stub created (all empty strings)
- [ ] Set env vars: `PRIVATE_KEY`, `DEPLOYER_ADDRESS`, `POOL_MANAGER_ADDRESS`, `USDC_ADDRESS`, `WETH_ADDRESS`
- [ ] Run: `forge script script/Deploy.s.sol --rpc-url unichain_sepolia --broadcast --verify`
- [ ] Fill deployed addresses into `deployments/unichain-sepolia.json`
- [ ] Set env vars: `CALLBACK_CONTRACT`, `PRISM_HOOK_ADDRESS`, `WATCHED_POOL_ID`, `LASNA_RPC_URL`
- [ ] Run: `forge script script/DeployRSC.s.sol --rpc-url lasna --broadcast`
- [ ] Run: `cast send $PRISM_HOOK "setCallbackContract(address)" $CALLBACK_CONTRACT --rpc-url unichain_sepolia`
- [ ] Health check: `cast call $PRISM_HOOK "callbackContract()"` returns PrismCallback address
- [ ] Update `Prism/frontend/lib/addresses.ts` with deployed addresses
- [ ] Update `DEMO_POOL_ID` in `Prism/frontend/app/page.tsx`

## Phase 6 — Demo Staging ⬜ NOT STARTED
- [ ] Wallets funded: protocol ≥ 5000 USDC, LP ≥ 1 ETH + 2000 USDC (Unichain Sepolia)
- [ ] TX 1 pre-staged: `setStandingBid(poolId, 0.5e18, 5000e6)` confirmed on-chain
- [ ] TX 2 pre-staged: LP deposit → LP-Y in LP wallet, LP-D auto-sold to protocol wallet
- [ ] TX 3 pre-staged: large swap → ETH price ~$1500, ~$320 IL accrued
- [ ] Live TX rehearsed: LP-Y exit → verify $4012 received, IL = $0 shown
- [ ] RSC callback rehearsed (or manual `settleLPD` fallback documented)
- [ ] Screen recording of all 6 steps saved as fallback (label: "USE THIS IF LIVE FAILS")
- [ ] Block explorer bookmarks: both wallets + hook contract + RSC on Lasna
- [ ] Frontend loaded at demo URL, wallet pre-connected, correct chain

---

## Deployed Addresses
*(fill in after Phase 5)*

```json
{
  "network": "unichain-sepolia",
  "LPYToken": "",
  "LPDToken": "",
  "PrismHook": "",
  "PrismCallback": "",
  "PrismRSC": "(Lasna)",
  "poolId": "",
  "deployBlock": 0
}
```

---

## Current Status (June 1 2026)

**Coverage target hit.** 56/56 tests passing (`forge test`). Coverage via `forge coverage --ir-minimum`:

| File | Lines | Branches | Functions |
|---|---|---|---|
| `src/PrismHook.sol` | 90.48% (152/168) | 72.97% (27/37) | **100%** (24/24) |
| `src/PrismCallback.sol` | **100%** | **100%** | **100%** |
| `src/LPYToken.sol` | **100%** | **100%** | **100%** |
| `src/lib/ILMath.sol` | **100%** | **100%** | **100%** |
| `src/lib/PositionId.sol` | **100%** | **100%** | **100%** |

Scripts and `reactive/PrismRSC.sol` are 0% — deployment-only code that cannot be tested without a live chain.

**What was completed this session:**
- 18 new coverage tests added to `test/PrismHook.t.sol` targeting: admin (setCallbackContract, pause/unpause), cancelStandingBid, claimLPDCollateral, settleLPD revert/no-IL paths, claimFees reverts, claimILCompensation no-comp revert, purchaseLPD reverts, beforeRemoveLiquidity settled revert, bid capacity exhaustion, and all 7 disabled hook stubs
- Created `test/PrismCallback.t.sol` with `MockHookForCallback` — 6 tests covering both RSC callback paths and auth guards
- Command: `forge coverage --ir-minimum` (required because `via_ir = true` in foundry.toml causes "stack too deep" without it)

**Remaining blockers before demo:**
1. Funded wallet + RPC URLs → run deployment scripts (Phase 5)
2. Fill addresses into frontend → `lib/addresses.ts` + `DEMO_POOL_ID`
3. Pre-stage demo transactions (Phase 6)

**Architecture note (whitepaper/spec updated):** v1 uses winner-takes-slot (one bid per pool). Competition is sequential — a new protocol displaces the incumbent by setting a superior bid. Multi-bidder priority queue is explicitly v2 scope. `whitepaper.tex` §intro + §7.3 and `spec.md` updated to reflect this accurately; PDF recompiled.

**Next build action:** Phase 5 — funded wallet + RPC env vars → forge script deployment.
