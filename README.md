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

A `setStandingBid` call pre-deposits USDC once. Every subsequent LP deposit automatically sells LP-D in the same transaction — no second step, no manual negotiation.

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
    └── auto-fill standing bid               │
                                             ▼
Protocol Wallet                         PrismCallback
    │                                        │
    └── setStandingBid(USDC) ──────────►     └── settleLPD(posId)
                                                  (calls back to hook)
```

---

## Demo

_GIF: deposit → LP-D auto-sold to standing bid → IL drops → RSC fires settlement → LP-Y holder claims USDC compensation_

Live deployment: [Unichain Sepolia](https://sepolia.uniscan.xyz/address/0x12be5F9664F2eB1b74f72e9B9f3054d2eB434700)

---

## Technical Details

<details>
<summary>Deployed contracts</summary>

**Unichain Sepolia (Chain ID 1301)**

| Contract      | Address                                      |
| ------------- | -------------------------------------------- |
| PrismHook     | `0x12be5F9664F2eB1b74f72e9B9f3054d2eB434700` |
| LPYToken      | `0x80aa616eDb2e333c804B125A17167C8236036eE0` |
| LPDToken      | `0x5f214AD25318F1bcfb8cE7B25e91f2619669307C` |
| PrismCallback | `0xBf662f9A4aC6a002C9870d2Ac48993757240bb1f` |
| USDC (Mock)   | `0x31d0220469e10c4E71834a79b1f276d740d3768F` |

**Lasna (Chain ID 5318007)**

| Contract | Address                                      |
| -------- | -------------------------------------------- |
| PrismRSC | `0x7F6e422f3184CBa32b655147C7233CdD007552A2` |

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

56 tests, 7 required settlement cases. Coverage: 90%+ lines on PrismHook.

</details>

<details>
<summary>Known limitations</summary>

- LP-D has no automatic price discovery at launch — requires a willing first buyer (protocol as its own LP-D buyer on cold start)
- v1 targets token/USDC pairs only — volatile/volatile pairs require a different collateral model
- LVR (loss-versus-rebalancing from arb) is not addressed
- One standing bid per pool in v1 — multi-bidder queue is v2 scope

</details>

---

## License

MIT
