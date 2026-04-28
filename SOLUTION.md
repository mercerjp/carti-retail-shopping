# SOLUTION

A retail shopping experience built as two coupled apps in one repository:

- **`bff/`** — NestJS Backend-For-Frontend. In-memory state, exposes `/api`.
- **`mobile/`** — React Native (Expo) client. Four screens, native-stack navigation.

This document covers running each side, the test suite, and the design decisions that aren't obvious from reading the code.

---

## Run

### Prereqs

- Node 18+ (tested on 20)
- `npm` 10+
- For mobile: Expo Go on a phone, or an iOS Simulator / Android Emulator

### Install

From the repo root:

```bash
npm install --workspaces --include-workspace-root
```

This installs both workspaces. Alternatively `cd bff && npm install` and `cd mobile && npm install` separately.

### BFF

```bash
cd bff
npm run start:dev    # watch mode on http://localhost:3000
```

Endpoints:

| Method | Path                                         | Purpose                       |
| ------ | -------------------------------------------- | ----------------------------- |
| GET    | `/api/products`                              | List catalogue + stock        |
| GET    | `/api/products/:id`                          | Single product                |
| GET    | `/api/discounts`                             | Active discounts              |
| GET    | `/api/discounts/:id`                         | Single discount               |
| POST   | `/api/carts`                                 | Create cart                   |
| GET    | `/api/carts/:id`                             | Get cart                      |
| POST   | `/api/carts/:id/items`                       | Add item `{productId, qty}`   |
| PATCH  | `/api/carts/:id/items/:productId`            | Set quantity (0 removes)      |
| DELETE | `/api/carts/:id/items/:productId`            | Remove line                   |
| POST   | `/api/carts/:id/checkout`                    | Check out, returns OrderSummary |

### Mobile

```bash
cd mobile
npm start            # opens Expo
```

The BFF base URL is read in this order:

1. `EXPO_PUBLIC_API_BASE_URL` env var
2. `expo.extra.apiBaseUrl` in `app.json`
3. `http://localhost:3000/api` fallback

Set `EXPO_PUBLIC_API_BASE_URL` (e.g. via a `.env` file or shell export) to override. **On a real device** the URL must reach your laptop's LAN IP, not `localhost` — set `EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000/api`.

### Tests

From the repo root:

```bash
npm test             # runs both workspaces
```

Or individually:

```bash
npm run test:bff     # 37 unit + 5 e2e
npm run test:mobile  # 14 RN + hook tests
```

---

## Assumptions

1. **Single user, no auth.** The BFF mints cart ids and trusts whoever holds one. Spec says no auth — fine.
2. **In-memory only.** State is lost on restart. Stock, carts, and reservations all live in `Map`s. Catalogue is reseeded on boot.
3. **Reservations decrement available stock at add-to-cart time** rather than tracking a separate `reserved` counter. Trade-off discussed below.
4. **Single currency (GBP).** Hardcoded in OrderSummary.
5. **Sessionless.** No cookie/JWT — the cart id is the only identifier. The mobile client holds it in React state, so a process kill loses the cart (but the BFF expires it on its own after 2 minutes anyway).
6. **No real payment.** `POST /carts/:id/checkout` simulates success deterministically given valid state.

---

## Discount engine

Four kinds of discount, all evaluated automatically by `DiscountEngine.price()` at checkout:

| Kind                  | What it does                                                      | Seed example                          |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| `PERCENT_OFF_PRODUCT` | N% off every unit of a specific SKU                               | 20% off coffee beans                  |
| `BUY_X_GET_Y_FREE`    | For every (X+Y) of an SKU in cart, Y units are free               | Oat milk: 3 for 2 (`buy=2, free=1`)   |
| `BUNDLE`              | Fixed amount off when all SKUs are present, scaled by min line qty | Coffee + oat milk together: £2 off    |
| `FIXED_OFF_ORDER`     | Fixed amount off when post-product-discount subtotal ≥ threshold  | £5 off when subtotal ≥ £30            |

**Order of application matters.** Product-scoped promos run first; the `FIXED_OFF_ORDER` threshold is then checked against the **post-product-discount** subtotal. This avoids a customer triggering "£5 off £30" with discountable items that bring the real spend below £30.

The engine is a pure function (`PricingResult` shape: `{subtotalCents, applied[], discountTotalCents, totalCents}`) — easy to unit test, swappable later for a rules service. `Math.max(0, ...)` on the total prevents negative payouts when stacked discounts exceed the subtotal.

---

## Data persistence

In-memory `Map<id, T>`. Each domain has its own service that owns its map:

- `ProductsService` — catalogue + stock primitives (`reserveStockOrThrow`, `releaseStock`)
- `DiscountsService` — discount catalogue
- `CartsService` — carts keyed by uuid

The reason for the centralised Products store is the **stock model**:

- "Available stock" = the `stock` field on Product.
- Reserve = decrement; release = increment.
- A reservation is just held inventory — there's no separate `reserved` counter.

This means another browser browsing the catalogue while item A is in someone's cart sees stock minus the held units, which is the desired retail behaviour (you don't want to advertise inventory that's already spoken for).

The read-modify-write `stock - quantity` pattern is safe under Node's single-threaded event loop because no `await` separates the read from the write inside `reserveStockOrThrow`. A multi-process deployment would need actual atomic decrements (Redis `DECRBY`, SQL `UPDATE ... WHERE stock >= ?`); the take-home runs single-process.

### Reservation lifecycle (the 2-minute TTL)

`CartsService` runs a sweeper every 5 seconds (`setInterval`, `unref`'d so it doesn't block process exit). On each tick it walks the active carts; any cart whose `lastActivityAt` is more than `RESERVATION_TTL_MS` (2 min) in the past is **expired**:

1. Each line's `quantity` is released back to product inventory.
2. Cart status flips to `'expired'`.
3. Subsequent mutations on that cart id throw 400 ("Cart X is expired") with a clear message.

`touch(cart)` resets `lastActivityAt` on every successful add/update/remove, so an active shopper isn't penalised. `markCheckedOut` is the success path: stock stays decremented (the items were sold), cart transitions out of `active` so it can't be mutated.

### Stock-failure path

A naïve design would check stock at checkout. Because we reserve at add-to-cart time, **the only place a stock failure can surface is `POST /carts/:id/items`** (or `PATCH` raising the qty). Once a line is in the cart, the inventory is provably held. Checkout failures reduce to: unknown cart, empty cart, expired/already-checked-out cart. The mobile UI shows the BFF's error message verbatim ("Insufficient stock for Sourdough Loaf: requested 5, available 12") on the Detail / Cart screens.

---

## Mobile: navigation, state, components

### Navigation

`@react-navigation/native-stack` with a typed `RootStackParamList`. Four screens, no tabs/drawers — a stack is enough for the user journey (List → Detail → Cart → Checkout, with `popToTop()` from Checkout).

### State management

A single `CartProvider` context. No Redux, no Zustand — overkill for one cart. The provider holds:

- `cart: Cart | null` (BFF response, source of truth)
- `loading`, `error` for the in-flight mutation
- A `useRef`-held in-flight `createCart` promise so two rapid `addItem` taps **don't mint two carts** (real bug caught in PR review #6)

Cart creation is **lazy**: we don't `POST /carts` until the user actually adds something, so browsing doesn't burn reservations.

Per-screen async state (e.g. fetching the product list, loading product details) lives in the screen with `useState`/`useEffect`. There's no global cache — at this size the round-trips aren't worth React Query's footprint.

### Component architecture

- Screens consume `useCart()` for cart actions and call `api` directly for catalogue reads.
- `format.ts` for currency, `api.ts` for the typed fetch client. No styled component library — vanilla `StyleSheet` to keep the bundle small.
- All interactive elements have `accessibilityRole`/`accessibilityLabel`.
- Defensive UX: `−` is disabled at qty 1 (use the dedicated Remove button), `+` is disabled when no available stock remains, the empty-cart branch only renders if there's truly no cart or no lines, and the post-checkout navigation happens **before** the local cart state clears so the empty-cart screen never flashes.
- `ProductListScreen` refetches via `useFocusEffect` so stock reflects the latest state after returning from checkout (the screen stays mounted in the back stack, so a mount-only effect would show stale stock).

---

## Testing strategy

### BFF

- **Unit tests** (`*.spec.ts` colocated with services) — pure logic: discount engine math, stock primitives, cart TTL behaviour, checkout flow.
- **e2e tests** (`bff/test/app.e2e-spec.ts`) — boots the full Nest app with `supertest`, exercises HTTP. Notably asserts `GET /products/:id` stock decrements after a successful checkout (locking in the spec line "stock levels update at runtime as carts check out").

`npm test` in `bff/` runs unit then e2e. 37 + 5 = 42 cases.

### Mobile

- `format.test.ts` — pure unit. Normalises NBSP in `Intl.NumberFormat` output for runtime determinism.
- `CartContext.test.tsx` — hook tests via `@testing-library/react-native`. Locks in lazy creation, the concurrent-addItem dedupe (regression for PR #6's race), error-path surfacing, and quantity accumulation.
- Per-screen smoke tests for ProductList / ProductDetail / Checkout — render in a test `NavigationContainer`, mock the api module, assert key text and that taps wire through.
- `__mocks__/api.ts` is a stateful in-memory mock backed by a `Map`, so quantity-merging tests are real, not tautological.

14 cases. `npm test` in `mobile/`.

### What I'd add given more time

- Cart screen interaction test (qty +/− under stock cap)
- BFF concurrent-add stress test (single-process — should still hold)
- Snapshot of the OrderSummary JSON so any field-shape change is caught
- Playwright/Detox for a real end-to-end mobile flow

---

## Repo / process

This repo was built incrementally as 8 small PRs (#1–#8), each reviewed by an automated reviewer subagent before merge. The PR comments capture the back-and-forth: at least one substantive bug caught per review (quantity validation in PR #2, race in PR #6, UX bugs in PR #7, test coverage gaps in PR #8).

```
#1 NestJS scaffold
#2 Products module + tests
#3 Discounts engine + tests
#4 Carts module + 2-min TTL
#5 Checkout + e2e
#6 Mobile scaffold + state
#7 Mobile screens
#8 Mobile tests
```

Final commit on `main` adds this SOLUTION.md.
