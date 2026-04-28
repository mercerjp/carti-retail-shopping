# SOLUTION

A retail shopping experience delivered as two apps in one repo:

- **`bff/`** — NestJS Backend-for-Frontend, in-memory state, exposes `/api`.
- **`mobile/`** — React Native (Expo) client.

The repo is an npm workspaces monorepo so a single `npm install` at the root sets up both sides.

---

## How to run

### Prerequisites

- Node 18+ (tested on 20)
- npm 10+
- For mobile: Expo Go on a phone, or an iOS Simulator / Android Emulator

### Install

From the repo root:

```bash
npm install --workspaces --include-workspace-root
```

### Run the BFF

```bash
cd bff
npm run start:dev    # http://localhost:3000, prefix /api
```

### Run the mobile app

```bash
cd mobile
npm start            # opens Expo
```

The BFF base URL is resolved in this order:

1. `EXPO_PUBLIC_API_BASE_URL` env var
2. `expo.extra.apiBaseUrl` in `app.json`
3. `http://localhost:3000/api` fallback

On a real device set `EXPO_PUBLIC_API_BASE_URL=http://<your-LAN-IP>:3000/api` — `localhost` won't reach your laptop from the phone.

### Run the tests

From the repo root:

```bash
npm test             # runs both workspaces
```

Or per workspace:

```bash
npm run test:bff
npm run test:mobile
```

---

## API surface

| Method | Path                                | Purpose                          |
| ------ | ----------------------------------- | -------------------------------- |
| GET    | `/api/products`                     | List catalogue with stock        |
| GET    | `/api/products/:id`                 | Single product                   |
| GET    | `/api/discounts`                    | List active discounts            |
| GET    | `/api/discounts/:id`                | Single discount                  |
| POST   | `/api/carts`                        | Create cart                      |
| GET    | `/api/carts/:id`                    | Get cart                         |
| POST   | `/api/carts/:id/items`              | Add item `{productId, quantity}` |
| PATCH  | `/api/carts/:id/items/:productId`   | Set quantity (0 removes)         |
| DELETE | `/api/carts/:id/items/:productId`   | Remove line                      |
| POST   | `/api/carts/:id/checkout`           | Checkout, returns OrderSummary   |

---

## Product catalogue

Hardcoded seed data in `bff/src/products/products.seed.ts`, loaded into an in-memory `Map` at boot. Stock fields are mutable — they decrease on reserve and increase on release.

| ID                 | Name                              | Price  | Stock |
| ------------------ | --------------------------------- | ------ | ----- |
| `p-coffee-beans`   | Single-Origin Coffee Beans 250g   | £12.99 | 24    |
| `p-oat-milk`       | Barista Oat Milk 1L               | £2.49  | 60    |
| `p-sourdough`      | Sourdough Loaf                    | £5.49  | 12    |
| `p-dark-chocolate` | Dark Chocolate 70% 100g           | £3.99  | 40    |
| `p-olive-oil`      | Extra Virgin Olive Oil 500ml      | £14.99 | 18    |
| `p-pasta`          | Bronze-Cut Spaghetti 500g         | £3.29  | 50    |
| `p-tomato-sauce`   | San Marzano Tomato Sauce 400g     | £4.49  | 0     |

The `p-tomato-sauce` line ships with stock 0 to make the out-of-stock UI path easy to demo.

---

## Discount catalogue

Hardcoded seed data in `bff/src/discounts/discounts.seed.ts`. Four promotional kinds, all evaluated automatically at checkout.

| ID                          | Name                          | Kind                  | Effect                                          |
| --------------------------- | ----------------------------- | --------------------- | ----------------------------------------------- |
| `d-coffee-20`               | 20% off coffee beans          | `PERCENT_OFF_PRODUCT` | 20% off every unit of `p-coffee-beans`         |
| `d-oat-milk-3-for-2`        | Oat milk: 3 for 2             | `BUY_X_GET_Y_FREE`    | Buy 2, get 1 free (per group of 3)              |
| `d-coffee-oatmilk-bundle`   | Coffee & oat milk bundle      | `BUNDLE`              | £2 off per matched pair of coffee + oat milk    |
| `d-order-5-over-30`         | £5 off when you spend £30     | `FIXED_OFF_ORDER`     | £5 off if post-product-discount subtotal ≥ £30  |

### How promotional discounts work

Pricing is a pure function (`DiscountEngine.price()` in `bff/src/discounts/discount-engine.ts`) that takes cart lines and returns:

```ts
{ subtotalCents, applied: AppliedDiscount[], discountTotalCents, totalCents }
```

The four kinds:

- **`PERCENT_OFF_PRODUCT`** — for the line matching `productId`, the discount is `round(lineTotal × percent / 100)`.
- **`BUY_X_GET_Y_FREE`** — for the matching line, group size is `buyQuantity + freeQuantity`. Free units = `floor(quantity / groupSize) × freeQuantity`. Discount = free units × unit price.
- **`BUNDLE`** — every product in `productIds` must be present with quantity ≥ 1. Number of bundles = the minimum line quantity across the bundle. Discount = bundles × `amountCents`.
- **`FIXED_OFF_ORDER`** — flat `amountCents` off if the order subtotal meets `minSubtotalCents`.

**Order of application matters.** Product-scoped promos (`PERCENT_OFF_PRODUCT`, `BUY_X_GET_Y_FREE`, `BUNDLE`) run first. The `FIXED_OFF_ORDER` threshold is evaluated against the **post-product-discount** subtotal, so a customer can't trigger "£5 off £30" with discounted items that bring their real spend below £30. The final total is clamped at `Math.max(0, …)` so stacked discounts can never produce a negative payout.

Only discounts with `active: true` are considered. The list is exposed via `GET /api/discounts` so a UI could surface them, though the mobile app currently shows applied discounts on the order summary only.

---

## Cart lifecycle and stock reservation

The instructions specify three rules. Each is implemented as follows:

### 1. Stock is reserved while a cart is active

When an item is added (`POST /carts/:id/items`) or its quantity raised (`PATCH …/items/:productId`), `ProductsService.reserveStockOrThrow` decrements `Product.stock` by the requested amount. If stock is insufficient the call throws `400` with a human-readable message ("Insufficient stock for Sourdough Loaf: requested 5, available 12") which the mobile app surfaces verbatim.

There is no separate `reserved` counter. The product's `stock` field represents inventory **available to reserve** — held units are invisible to other browsers, which is the desired retail behaviour (you don't advertise inventory that's already spoken for).

Lowering a quantity (`PATCH` with a smaller value) or removing a line releases the difference back to inventory immediately.

Because reservations happen at add-time, **the only place a stock failure can surface is on add/raise**. By the time a line is in the cart, the stock is provably held — checkout cannot fail for stock reasons.

### 2. Reservations are released after 2 minutes of cart inactivity

`CartsService` runs a sweeper every 5 seconds (`setInterval`, `unref`'d so it doesn't keep the process alive). On each tick it walks active carts; any cart whose `lastActivityAt` is more than `RESERVATION_TTL_MS` (= 2 min) in the past is **expired**:

1. Each line's quantity is released back to product inventory.
2. Cart status flips from `active` → `expired`.
3. Subsequent mutations / checkout on that cart id throw `400` ("Cart … is expired") so the UI can prompt the user to start a new cart.

`touch(cart)` updates `lastActivityAt` on every successful add/update/remove, so an active shopper isn't penalised. The same sweep also runs on the read paths (`get`, `requireActive`) so an idle reviewer hitting `GET /carts/:id` after 2 minutes sees the expired status without waiting for the next tick.

### 3. Reservations are released on checkout (successful or failed)

- **Successful checkout** — the held units have been "sold", so they stay decremented. `markCheckedOut` flips the cart's status to `checked_out` so it can no longer be mutated; from the cart's perspective the reservation is released (the stock now belongs to the order).
- **Failed checkout** — the only reachable failure paths are:
  - Unknown cart id → nothing to release.
  - Empty cart → no reservations exist.
  - Cart is `expired` → reservations were already released by the sweeper.
  - Cart is `checked_out` → reservations were already settled by the prior successful checkout.

Stock can never be insufficient at checkout because of rule 1, so there is no "stock-failure at checkout" branch to handle. The order summary returned on success contains: order id, cart id, placed-at timestamp, line items with unit and line totals, applied discounts, subtotal, discount total, grand total, and currency.

---

## Data persistence

In-memory only, per the constraints. Each domain has its own service that owns a `Map<id, T>`:

- `ProductsService` — catalogue + stock primitives.
- `DiscountsService` — discount catalogue.
- `CartsService` — carts keyed by uuid.

The product and discount catalogues are reseeded on every boot from the `*.seed.ts` files. Cart state is created on demand and lost on restart. Read-modify-write on `Product.stock` is safe under Node's single-threaded event loop because no `await` separates the read from the write inside `reserveStockOrThrow`. A multi-process deployment would need an atomic decrement (Redis `DECRBY`, SQL `UPDATE … WHERE stock >= ?`); the take-home runs single-process.

---

## Mobile app

### Navigation

`@react-navigation/native-stack` with a typed `RootStackParamList`. Four screens — Product List → Product Detail → Cart → Checkout — chained as a stack with `popToTop()` from Checkout back to the list. A stack is sufficient for this linear flow; tabs/drawers would be overkill.

### State management

A single `CartProvider` context. No Redux/Zustand — overkill for one cart. The provider holds the BFF's cart response as the source of truth, plus loading/error state for the in-flight mutation. Cart creation is **lazy** — `POST /carts` is only fired the first time the user adds something, so just browsing doesn't burn a reservation. An in-flight `createCart` promise is held in a `useRef` so two rapid taps cannot mint two carts.

Per-screen async state (catalogue list, product detail) lives in the screen with `useState`/`useEffect`. `ProductListScreen` refetches via `useFocusEffect` so stock reflects post-checkout state when the screen is revealed from the back stack.

### Component architecture

- Screens consume `useCart()` for cart actions and call the typed `api` module directly for catalogue reads.
- `format.ts` for currency, `api.ts` for the typed fetch client.
- Vanilla `StyleSheet` — no UI library.
- Interactive elements have `accessibilityRole`/`accessibilityLabel`.

### UI / Branding

A Legal & General-inspired visual style is implemented through a centralised theme module at `mobile/src/theme.ts`. It exports a frozen `theme` object with `colors`, `spacing`, `radii`, `typography`, and `shadows` tokens. The palette is anchored on ink black (`#000000`) for primary surfaces and CTAs with an L&G magenta accent (`#E4007F`) for links, secondary actions, and the checkout grand total. Cards use a white surface on a light-grey canvas with subtle elevation. Every screen and `App.tsx` consume tokens from this module — no ad-hoc hex values remain in screen styles. No new dependencies were added; styling is plain `StyleSheet`.

### Error handling

The fetch client parses BFF error bodies and rethrows with the server's message. Screens render that message inline (e.g. on the Product Detail / Cart screens for stock errors, on Checkout for any failure) — never a raw error object or a blank screen.

---

## Testing strategy

### BFF

- **Unit tests** (`*.spec.ts` colocated with services) cover the discount engine math, stock primitives, cart TTL behaviour, and the checkout flow.
- **e2e tests** (`bff/test/app.e2e-spec.ts`) boot the full Nest app via `supertest` and exercise the HTTP surface, including verifying that `GET /products/:id` shows decremented stock after a successful checkout.

`npm test` in `bff/` runs unit + e2e.

### Mobile

- `format.test.ts` — pure unit, normalises NBSP from `Intl.NumberFormat` for deterministic asserts.
- `CartContext.test.tsx` — hook tests via `@testing-library/react-native` covering lazy cart creation, the concurrent-`addItem` dedupe, error surfacing, and quantity merging.
- Per-screen smoke tests for ProductList / ProductDetail / Checkout — render in a test `NavigationContainer`, mock the api module, assert key text and tap behaviour.
- `__mocks__/api.ts` is a stateful in-memory mock so quantity-merging assertions are real, not tautological.

`npm test` in `mobile/`.

---

## Assumptions

1. **Single user, no auth.** The BFF mints cart ids and trusts whoever holds one. Per the spec.
2. **In-memory only.** State is lost on restart; product/discount catalogues are reseeded on boot.
3. **Reservations decrement live stock at add-time** rather than tracking a separate `reserved` counter — see *Cart lifecycle* for rationale.
4. **Single currency (GBP).** Hardcoded on the order summary.
5. **Sessionless.** The cart id is the only identifier and is held in React state on the client.
6. **Simulated checkout.** No payment integration; a successful checkout deterministically returns an order summary.
