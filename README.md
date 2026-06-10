# Prism

**LP yield without impermanent loss.**

> _"Pendle for Uniswap LP positions."_

Built for UHI9 Hookathon · Unichain Sepolia · Reactive Network

---

## Problem

Every Uniswap LP position bundles two completely different financial products:

- **Fee yield** — income from swaps. Predictable. What LPs actually want.
- **Delta exposure** — impermanent loss. Pure price risk. Nobody wants this.

They've always been inseparable. Prism separates them.

---

## Insight

IL and fees come from the same position, but they're owned by different risk appetites.

A yield-seeking LP wants fees and hates IL. A protocol treasury wants deep liquidity and can absorb IL on its own token. There's a trade waiting to happen — it just never had a venue.

Prism is the venue.

---

## Mechanism

On every deposit, Prism mints two ERC-1155 tokens:

| Token    | What it represents                                            | Who wants it                        |
| -------- | ------------------------------------------------------------- | ----------------------------------- |
| **LP-Y** | 100% of swap fees, zero IL                                    | Retail LPs, yield seekers           |
| **LP-D** | Absorbs 100% of IL, earns fee share, requires USDC collateral | Protocol treasuries, IL speculators |

An LP who holds both tokens has standard LP exposure — the split is accounting clarity.

An LP who sells LP-D immediately holds **pure fee yield with zero IL** — the delta was purchased by a willing counterparty.

---

## Protocol-Owned LP-D

A protocol treasury can buy LP-D from LPs in their own pool.

```
Old way:  Protocol emits 100,000 TOKEN/week
          → mercenary LPs farm and dump
          → emissions are inflationary forever

Prism:    Protocol buys LP-D with USDC
          → LPs hold LP-Y (zero IL)
          → protocol absorbs own-token IL
          → if price reverts, collateral returns
          → net cost = actual IL, not perpetual emissions
```

A `postBid` call pre-deposits USDC once into an on-chain order book (up to 20 bids per pool). Every subsequent LP deposit automatically sells LP-D to the best-scoring bid in the same transaction — no second step, no manual negotiation.

---

## Reactive Automation

`PrismRSC` on Reactive Network's Lasna testnet subscribes to two event streams from Unichain Sepolia:

1. **`PositionOpened`** — registers new LP-D positions
2. **`Swap`** — on every swap, evaluates two conditions across all active positions

**Condition 1 — Price Reversion:** price returns within 1% of LP's entry → collateral returned to LP-D holder at a profit.

**Condition 2 — Liquidation Threshold:** IL reaches 90% of collateral vault → force-settle before LP-Y is left unprotected.

No cron job. No keeper. No manual trigger. The settlement fires the moment the on-chain condition is met.

---

## Why Uniswap v4 Hooks

v4 hooks make Prism possible with three specific capabilities:

**`afterAddLiquidity`** — fires after every deposit, in the same transaction. This is where LP-Y and LP-D are minted, and where standing bids auto-fill. In v3 this would require a wrapper contract that LPs must know to use.

**`before/afterRemoveLiquidity`** — fires when an LP exits. This is where IL is computed and drawn from the collateral vault before the LP receives their principal back. The LP is made whole atomically.

**Lazy fee collection via `modifyLiquidity(liquidityDelta=0)`** — v4 allows fee accounting without moving liquidity. Prism collects fees on-demand rather than hooking every swap, keeping gas overhead off the critical path.

Without hooks, the LP-D sale and IL settlement would require 3–4 separate transactions. With hooks, it's one.

---

## Architecture

```
Unichain Sepolia                        Lasna (Reactive Network)
─────────────────────────────────────   ─────────────────────────

LP deposits                              PrismRSC
    │                                        │
    ▼                                        │  subscribes to
PrismHook ◄──── PoolManager                 │  PositionOpened
    │                                        │  Swap events
    ├── mint LP-Y (ERC-1155)                 │
    ├── mint LP-D (ERC-1155)                 │  fires on condition
    └── auto-fill best order-book bid        │
                                             ▼
Protocol Wallet                         PrismCallback
    │                                        │
    └── postBid(USDC) ─────────────────►     └── settleLPD(posId)
                                                  (calls back to hook)
```

---

## Demo

_GIF: deposit → LP-D auto-sold to standing bid → IL drops → RSC fires settlement → LP-Y holder claims USDC compensation_

Live deployment: [Unichain Sepolia](https://unichain-sepolia.blockscout.com/address/0xbE169aD708CEA009236943607980DF7Ec8ec4700)

---

## Technical Details

<details>
<summary>Deployed contracts</summary>

**Unichain Sepolia (Chain ID 1301)** — deployed at block 54240730

| Contract      | Address                                      |
| ------------- | -------------------------------------------- |
| PrismHook     | `0xbE169aD708CEA009236943607980DF7Ec8ec4700` |
| LPYToken      | `0xf3077cCFBE8Be2cAAb7C5B763858e49b87f44513` |
| LPDToken      | `0xd2AC3dB3021ea25d4D40Df5EF7764Aac10D87F3E` |
| PrismCallback | `0x7cad80B54FEc3bEBf932688FDCdbD3926eedb1e1` |
| PrismRouter   | _see `deployments/unichain-sepolia.json`_    |
| USDC (Mock)   | `0x31d0220469e10c4E71834a79b1f276d740d3768F` |
| PRISM (Mock)  | `0xCf864db2623735b28BEC4863490e19b13C7B1a5F` |

Demo pool: USDC/PRISM, fee=500 (0.05%), tickSpacing=10 —
poolId `0xa072e8c53693e3ad8ee2242ecbdad917c083bbf616328a4e2556fd73f72a8773`

**Lasna (Chain ID 5318007)**

| Contract | Address                                      |
| -------- | -------------------------------------------- |
| PrismRSC | `0xd42dbe0b1373B0FBBb78E01a9489362187858a7f` |

</details>

<details>
<summary>IL calculation (oracle-free)</summary>

Based on the funded-LP formula from Lipton, Lucic, Sepp (2024). IL depends only on the price ratio, not absolute levels:

```
ε_funded = sqrtPriceCurrent / sqrtPriceEntry − 1
```

All results WAD-scaled. No external oracle — computable from `StateLibrary.getSlot0`.

</details>

<details>
<summary>Hook permissions</summary>

```
AFTER_ADD_LIQUIDITY_FLAG     = 1 << 10
BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9
AFTER_REMOVE_LIQUIDITY_FLAG  = 1 << 8
Combined mask: 0x0700
```

`afterSwap` is not used — fees collected lazily, no per-swap overhead.

</details>

<details>
<summary>Build and test</summary>

```bash
cd Prism
forge build
forge test -vvv
```

65 tests, 7 required settlement cases. Coverage: 90%+ lines on PrismHook.

</details>

<details>
<summary>Known limitations</summary>

- LP-D has no automatic price discovery at launch — requires a willing first buyer (protocol as its own LP-D buyer on cold start)
- v1 targets token/USDC pairs only — volatile/volatile pairs require a different collateral model
- LVR (loss-versus-rebalancing from arb) is not addressed
- Order book capped at 20 active bids per pool (`MAX_BIDS_PER_POOL`) to bound `afterAddLiquidity` gas

</details>

---

## License

MIT
