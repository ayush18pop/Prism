# Prism

**LP yield without impermanent loss.**

A Uniswap v4 hook that splits every LP deposit into a yield token and a risk token — and runs a live market between them, inside the pool itself.

Built for UHI9 Hookathon · Live on Unichain Sepolia · Automated by Reactive Network

**Live app: [prism.ayush.works](https://prism.ayush.works/)**

---

## 30-second version (for judges)

- Every LP deposit is split into **LP-Y** (earns all swap fees, zero IL) and **LP-D** (absorbs all IL, earns a fee share, backed by USDC collateral).
- Protocols **bid for LP-D** on an on-chain order book. When an LP deposits, the hook fills the best bid **atomically in the same transaction** — split, match, collateral lock, one tx.
- On exit, the hook computes IL **oracle-free** (entry vs. exit sqrtPrice, read straight from the pool) and pays it from the buyer's collateral vault. The LP walks away whole.
- An **RSC on Reactive Network** watches every swap cross-chain and auto-settles LP-D positions when price reverts through entry — no keepers, no cron.
- **66/66 Foundry tests passing. 6 contracts across 2 chains. Fully deployed, full dApp at [prism.ayush.works](https://prism.ayush.works/).**

Same pool, same −25% price move:

| | Standard LP | LP-Y holder (Prism) |
| --- | ---: | ---: |
| Principal returned | $3,680.00 | $4,000.00 |
| Impermanent loss | **−$320.00** | **$0.00** (paid by LP-D vault) |
| Fees earned | +$12.00 | +$12.00 |
| **Net** | **$3,372.00** | **$4,012.00** |

---

## Problem

Every Uniswap LP position bundles two completely different financial products:

- **Fee yield** — income from swaps. Predictable. What LPs actually want.
- **Delta exposure** — impermanent loss. Pure price risk. Nobody wants this.

A 2021 study of 17,000 wallets found ~50% of Uniswap LPs underperformed simply holding. Meanwhile, protocols run liquidity mining programs — perpetual token emissions — to compensate LPs for exactly this risk. The moment emissions slow, TVL leaves. Rented liquidity.

One side needs to offload IL. The other side is already paying to make it go away. There's never been a market between them. Prism is the venue.

---

## Mechanism

On every deposit, the hook mints two ERC-1155 tokens (tokenId = positionId):

| Token | What it represents | Who wants it |
| --- | --- | --- |
| **LP-Y** | 100% of swap fees, zero IL | Retail LPs, yield seekers |
| **LP-D** | Absorbs 100% of IL, earns a negotiated fee share, requires USDC collateral | Protocol treasuries, IL speculators |

An LP who holds both tokens has standard LP exposure — the split is accounting clarity.

An LP whose LP-D is sold holds **pure fee yield with zero IL** — the delta was purchased by a willing counterparty, whose USDC sits locked in the hook.

### The standing-bid market

A protocol calls `postBid` once: coverage level, fee share it wants in return, and a USDC budget (up to 20 active bids per pool). Every subsequent LP deposit auto-fills the best-scoring bid inside `afterAddLiquidity`:

```
Old way:  Protocol emits 100,000 TOKEN/week
          → mercenary LPs farm and dump
          → emissions are inflationary forever

Prism:    Protocol buys LP-D with USDC
          → LPs hold LP-Y (zero IL)
          → protocol absorbs own-token IL
          → if price reverts, collateral comes back
          → net cost = actual IL, not perpetual emissions
```

**Solvency guarantee:** a bid only fills if its collateral covers the *worst-case* IL for the deposit's full tick range (`cost ≥ maxIL`, computed at both tick boundaries). Underfunded bids are silently skipped — the LP keeps both tokens, the deposit never reverts.

---

## Sponsor integrations

### Uniswap v4 hooks — the hook *is* the protocol

- **`afterAddLiquidity`** — mints LP-Y/LP-D, matches the best standing bid, locks collateral. Atomic. In v3 this needs a wrapper contract LPs must opt into; in v4 it's invisible.
- **`before/afterRemoveLiquidity`** — computes IL oracle-free and settles from the vault before the LP receives principal. The LP is made whole atomically.
- **Lazy fee collection** via `modifyLiquidity(liquidityDelta=0)` — fee accounting without moving liquidity. No `afterSwap` hook, zero per-swap gas overhead. Permissions mask: `0x0700`.

### Reactive Network — settlement without keepers

**Where it's used (for sponsor judging):**

- [`reactive/PrismRSC.sol`](https://github.com/ayush18pop/Prism/blob/main/reactive/PrismRSC.sol) — the Reactive Smart Contract. Extends `AbstractReactive`, subscribes to `PositionOpened` and `Swap` events from the Unichain Sepolia pool, and evaluates settlement conditions in `react()` on every swap.
- [`src/PrismCallback.sol`](https://github.com/ayush18pop/Prism/blob/main/src/PrismCallback.sol) — the destination-chain callback receiver. Extends `AbstractCallback`; the authorized Reactive sender is immutable, set at construction.
- Deployed RSC on Lasna: [`0xd4ae...c441`](https://lasna.reactscan.net/address/0xd4ae7009f8B60685DEAA1a827670ce5F6Cc8c441) — live, subscribed, firing.

The RSC evaluates two conditions on every swap, across all active positions:

1. **Price reversion** — pool price returns within 1% of the LP's entry → the LP-D position auto-settles, collateral returns to the buyer at a profit. The buyer's upside is *guaranteed by infrastructure*, not by someone remembering to call a function.
2. **Liquidation guard** — IL reaches 90% of the collateral vault → force-settle before LP-Y protection is exhausted.

Settlement fires via cross-chain callback (Lasna → Unichain Sepolia) the moment the condition is true on-chain. No keeper, no cron, no manual trigger — Reactive is not a bolt-on here; it's the only component that can watch prices *across blocks*, which a hook fundamentally cannot do from inside a single transaction.

### Why Unichain

On Ethereum mainnet, the gas for a settlement call exceeds the IL it recovers on small positions. ~1s blocks and sub-cent gas make Prism's economics work at any position size — a design requirement, not a demo convenience.

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

## Deployed contracts

**Unichain Sepolia (chain ID 1301)** — deployed June 11 2026, block 54347616

| Contract | Address |
| --- | --- |
| PrismHook | [`0x77D7dE89E589955aD9f0bF2d96109bA3bfC28700`](https://unichain-sepolia.blockscout.com/address/0x77D7dE89E589955aD9f0bF2d96109bA3bfC28700) |
| LPYToken | `0xAc03a4479f8145CC6aA309462dB67F37988e551E` |
| LPDToken | `0xE1bE73219fC9D920351272daf40258E1107127C2` |
| PrismCallback | `0x8bc8F38d45eE60cAA22c9d492b39D1b8B302b595` |
| PrismRouter | `0x3837455C10d6589F0B64E27458832DEaa348d266` |
| USDC (mock) | `0x1f30D01D1766F26e62f8Aa7Dd5703a57E53183A3` |
| PRISM (mock) | `0xCf864db2623735b28BEC4863490e19b13C7B1a5F` |

Demo pool: USDC/PRISM, fee 3000 (0.30%), tickSpacing 60 —
poolId `0xba158a56ddd8704ba64386fa841a07a7f9d7065db4e314fbdd4b04eac57c936f`

**Lasna (chain ID 5318007)**

| Contract | Address |
| --- | --- |
| PrismRSC | [`0xd4ae7009f8B60685DEAA1a827670ce5F6Cc8c441`](https://lasna.reactscan.net/address/0xd4ae7009f8B60685DEAA1a827670ce5F6Cc8c441) |

---

## Build, test, run

```bash
cd Prism
forge build
forge test -vvv          # 66/66 passing

cd frontend
npm install && npm run dev   # Next.js 14 + Wagmi v2 dApp
```

The 66 tests cover all 7 required settlement cases — including: LP holds both tokens (standard exit), LP-D sold then LP exits (IL drawn from vault), RSC force-settle, bid auto-fill, underfunded-bid silent skip, IL compensation following an LP-Y transfer, and positionId collision resistance. Tests assert invariants (CEI ordering, idempotent settlement, auth guards), not just outputs.

Demo walkthrough with copy-paste commands: [`RUNBOOK.md`](RUNBOOK.md)

---

## Technical highlights

<details>
<summary>Oracle-free IL calculation</summary>

Based on the funded-LP formula from Lipton, Lucic, Sepp (2024). IL depends only on the price ratio, not absolute levels:

```
ε_funded = sqrtPriceCurrent / sqrtPriceEntry − 1
```

All math WAD-scaled, computed from `StateLibrary.getSlot0` — no Chainlink, no TWAP. Oracle manipulation is self-defeating: inflating IL requires a large swap that costs the attacker more than the inflated payout.

</details>

<details>
<summary>Security model</summary>

- **CEI everywhere** — collateral vault is zeroed and all state staged *before* any external transfer, in every settlement path.
- **Pull-based payments** — IL compensation and LP-D remainders are staged in claimable mappings, never pushed (ERC-1155 transfer callbacks are a reentrancy surface).
- **Claim-time ownership** — IL compensation goes to whoever holds LP-Y *at claim time* (`balanceOf` check), so it follows the token if sold.
- **Immutable authorization** — `PrismCallback`'s authorized RSC sender is set at construction and can never change.
- **Idempotent settlement** — `settled` flag checked before any vault math; force-settle, voluntary settle, and LP-exit all converge to identical accounting.

</details>

<details>
<summary>Hook permissions</summary>

```
AFTER_ADD_LIQUIDITY_FLAG     = 1 << 10
BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9
AFTER_REMOVE_LIQUIDITY_FLAG  = 1 << 8
Combined mask: 0x0700
```

`afterSwap` is deliberately not used — fees are collected lazily, keeping swap gas untouched.

</details>

<details>
<summary>Known limitations</summary>

- LP-D has no automatic price discovery at launch — requires a willing first buyer (protocol as its own pool's LP-D buyer on cold start)
- v1 targets token/USDC pairs — volatile/volatile pairs need a different collateral model
- LVR (loss-versus-rebalancing) is not addressed
- Order book capped at 20 active bids per pool to bound `afterAddLiquidity` gas

</details>

---

## More

- **[prism.ayush.works](https://prism.ayush.works/)** — live dApp on Unichain Sepolia
- [`RUNBOOK.md`](RUNBOOK.md) — step-by-step demo commands
- [`reactive/PrismRSC.sol`](https://github.com/ayush18pop/Prism/blob/main/reactive/PrismRSC.sol) — Reactive Network integration
- [`src/lib/ILMath.sol`](https://github.com/ayush18pop/Prism/blob/main/src/lib/ILMath.sol) — oracle-free IL math

## License

MIT
