# Prism Demo Runbook — June 19 2026

Every command below is copy-paste ready. Run from `Prism/` with `.env` loaded
(`source .env` or use `--private-key $PRIVATE_KEY` as written).

## Addresses (deployed June 10, block 54240730)

```bash
export RPC=https://sepolia.unichain.org
export HOOK=0xbE169aD708CEA009236943607980DF7Ec8ec4700
export ROUTER=<CURRENT PrismRouter from deployments/unichain-sepolia.json>
export USDC=0x31d0220469e10c4E71834a79b1f276d740d3768F
export PRISM=0xCf864db2623735b28BEC4863490e19b13C7B1a5F
export POOL_ID=0xa072e8c53693e3ad8ee2242ecbdad917c083bbf616328a4e2556fd73f72a8773
export PROTOCOL_WALLET=0x7975E591c26e6c6D9B0CFd9A81f6d61A921C080c   # deployer / bidder
export LP_WALLET=0xcda36A8183b6C6325EDCc9401B3382Dec8E2E7D5         # MetaMask LP
# Pool key tuple used everywhere below:
export KEY="($USDC,$PRISM,500,10,$HOOK)"
```

## Step 0 — Fund wallets (once)

Both mocks are open-mint. Each wallet also needs a little Unichain Sepolia ETH for gas
(bridge from Sepolia: https://www.unichain.org/bridge or faucet).

```bash
# 10,000 USDC + 10,000 PRISM to each wallet (6 decimals)
cast send $USDC  "mint(address,uint256)" $PROTOCOL_WALLET 10000000000 --rpc-url $RPC --private-key $PRIVATE_KEY
cast send $PRISM "mint(address,uint256)" $PROTOCOL_WALLET 10000000000 --rpc-url $RPC --private-key $PRIVATE_KEY
cast send $USDC  "mint(address,uint256)" $LP_WALLET       10000000000 --rpc-url $RPC --private-key $PRIVATE_KEY
cast send $PRISM "mint(address,uint256)" $LP_WALLET       10000000000 --rpc-url $RPC --private-key $PRIVATE_KEY
```

## Step 1 — TX1: protocol posts the bid (pre-stage, day before)

Do this in the UI (LP-D page, protocol wallet) — it handles approve + postBid.
CLI equivalent:

```bash
# approve hook to pull 800 USDC, then post: 100% coverage, 30% fee share
cast send $USDC "approve(address,uint256)" $HOOK 800000000 --rpc-url $RPC --private-key $PRIVATE_KEY
cast send $HOOK "postBid(bytes32,uint256,uint256,uint256,uint256)" \
  $POOL_ID 1000000000000000000 3000 10000 800000000 \
  --rpc-url $RPC --private-key $PRIVATE_KEY
```

Verify: LP-D page shows the bid in "Your Active Bids"; provide page BidList shows it starred.

## Step 2 — TX2: LP deposits (pre-stage, day before)

Use the UI (provide page, LP wallet): deposit 2000 USDC + 2000 PRISM, range ±20%.
Verify after deposit:
- Position card shows LP-Y pill only (LP-D sold) and "Collateral Vault" > 0
- `cast call $HOOK "getPosition(bytes32)(...)" <posId>` → lpDSold=true

Get the posId from the PositionOpened event in the deposit TX logs (Blockscout),
or from the position card header in the UI.

## Step 3 — TX3: price drop (pre-stage, morning of demo)

To drop PRISM, sell PRISM into the pool = `zeroForOne=false` (price tick goes UP;
PRISM gets cheaper per USDC). **ALWAYS use a price limit at the target — never
MAX/MIN sqrt price.** An unlimited swap through thin testnet liquidity blows the
pool to the max tick and breaks every price display (this happened June 10).

```bash
cast send $PRISM "approve(address,uint256)" $ROUTER 100000000000 --rpc-url $RPC --private-key $PRIVATE_KEY

# Sell up to 3000 PRISM but STOP at −25% (sqrtPrice for price 0.75).
# Note: flags BEFORE the `--`; everything after `--` is positional.
cast send $ROUTER "swap((address,address,uint24,int24,address),bool,int256,uint160)" \
  "$KEY" false \
  --rpc-url $RPC --private-key $PRIVATE_KEY \
  -- -3000000000 68613601432514894825936388096
```

The swap stops exactly at −25% no matter the input size (partial fill).
Each swap also accrues fees → the LP-Y pending fee row fills in.

**Price reset (recovery):** if the pool tick is ever stuck at an extreme, swap the
other direction with the limit at tick 0 (price 1.00). Through empty tick space the
price falls freely and costs almost nothing:

```bash
cast send $USDC "approve(address,uint256)" $ROUTER 100000000000 --rpc-url $RPC --private-key $PRIVATE_KEY
cast send $ROUTER "swap((address,address,uint24,int24,address),bool,int256,uint160)" \
  "$KEY" true \
  --rpc-url $RPC --private-key $PRIVATE_KEY \
  -- -100000000 79228162514264337593543950336
```

## Step 4 — LIVE: the exit (on stage)

LP wallet, provide page:
1. (Optional warm-up) "Claim Fees" — LP-Y share lands in wallet, LP-D share auto-pays the bidder
2. "Remove" → "Confirm Remove" — principal + fees return; IL drawn from vault, not LP
3. "IL Compensation" row appears → "Claim" → USDC lands

Verify the money shot: LP received full principal + fees, `lpYCompensation` paid from vault.

## Step 5 — RSC (second wow)

Push price back toward entry (buy PRISM with USDC):

```bash
cast send $USDC "approve(address,uint256)" $ROUTER 100000000000 --rpc-url $RPC --private-key $PRIVATE_KEY
# Buy PRISM back up, STOP at entry price 1.00 (limit = sqrtPrice at tick 0)
cast send $ROUTER "swap((address,address,uint24,int24,address),bool,int256,uint160)" \
  "$KEY" true \
  --rpc-url $RPC --private-key $PRIVATE_KEY \
  -- -3000000000 79228162514264337593543950336
```

RSC Condition 1 (price within ±1% of entry) should fire within a few Lasna blocks.

**Verify RSC fired:**
- Lasna explorer: https://lasna.reactscan.net/address/0xd42dbe0b1373B0FBBb78E01a9489362187858a7f
- Unichain side: PrismCallback 0x7cad80B54FEc3bEBf932688FDCdbD3926eedb1e1 on
  https://unichain-sepolia.blockscout.com — look for an inbound TX calling it
- On the hook: `cast call $HOOK "getPosition(bytes32)(...)" <posId>` → settled=true

**Manual fallback if RSC doesn't fire** (protocol wallet = LP-D holder settles voluntarily):

```bash
cast send $HOOK "settleLPD(bytes32)" <posId> --rpc-url $RPC --private-key $PRIVATE_KEY
```

Then claim remaining collateral in the UI (LP-D Collateral row) or:

```bash
cast send $HOOK "claimLPDCollateral(bytes32)" <posId> --rpc-url $RPC --private-key $PRIVATE_KEY
```

## Failure drills

| What breaks | Do this |
|---|---|
| Frontend down | Everything above has a cast equivalent — narrate from Blockscout |
| RSC silent | Manual `settleLPD` (above); say "voluntary settlement path" |
| Deposit reverts on stage | Use the pre-staged position from Step 2; never deposit live |
| Wallet on wrong chain | Yellow banner at top has a Switch button |
| RPC flaky | Backup RPC: https://unichain-sepolia.drpc.org |

## Pre-demo checklist (morning of June 19)

- [ ] `forge test` green (65/65)
- [ ] Frontend running, both wallets connected once (RainbowKit remembers)
- [ ] Step 1–3 pre-staged; position card shows IL ≈ −$320, vault funded
- [ ] Blockscout tabs bookmarked: hook, callback, both wallets, the deposit TX
- [ ] Lasna explorer tab open on PrismRSC
- [ ] Screen recording of full happy path saved locally ("USE THIS IF LIVE FAILS")
- [ ] This runbook open in a side terminal with `.env` sourced
