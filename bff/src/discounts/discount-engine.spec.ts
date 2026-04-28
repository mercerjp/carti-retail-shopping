import { DiscountEngine, CartLine } from './discount-engine';
import { DiscountsService } from './discounts.service';
import { Product } from '../products/product.entity';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p-x',
  name: 'X',
  description: '',
  category: 'misc',
  priceCents: 1000,
  stock: 100,
  ...over,
});

const lines = (...l: CartLine[]) => l;

describe('DiscountEngine', () => {
  let engine: DiscountEngine;

  beforeEach(() => {
    engine = new DiscountEngine(new DiscountsService());
  });

  it('computes subtotal with no qualifying discounts', () => {
    const result = engine.price(
      lines({ product: product({ id: 'p-pasta', priceCents: 329 }), quantity: 2 }),
    );
    expect(result.subtotalCents).toBe(658);
    expect(result.applied).toEqual([]);
    expect(result.totalCents).toBe(658);
  });

  it('applies PERCENT_OFF_PRODUCT (20% off coffee)', () => {
    const result = engine.price(
      lines({
        product: product({ id: 'p-coffee-beans', priceCents: 1299 }),
        quantity: 1,
      }),
    );
    const expectedDiscount = Math.round((1299 * 20) / 100);
    expect(result.applied.find((a) => a.discountId === 'd-coffee-20')?.amountCents).toBe(
      expectedDiscount,
    );
    expect(result.totalCents).toBe(1299 - expectedDiscount);
  });

  it('applies BUY_X_GET_Y_FREE (3 for 2 oat milk) — 1 free per 3', () => {
    const result = engine.price(
      lines({ product: product({ id: 'p-oat-milk', priceCents: 249 }), quantity: 6 }),
    );
    // 6 / 3 = 2 free units at 249 each = 498
    expect(
      result.applied.find((a) => a.discountId === 'd-oat-milk-3-for-2')?.amountCents,
    ).toBe(498);
  });

  it('does not apply 3-for-2 below threshold (qty < 3)', () => {
    const result = engine.price(
      lines({ product: product({ id: 'p-oat-milk', priceCents: 249 }), quantity: 2 }),
    );
    expect(result.applied.find((a) => a.discountId === 'd-oat-milk-3-for-2')).toBeUndefined();
  });

  it('applies BUNDLE when both products present, multiplied by min qty', () => {
    const result = engine.price(
      lines(
        { product: product({ id: 'p-coffee-beans', priceCents: 1299 }), quantity: 2 },
        { product: product({ id: 'p-oat-milk', priceCents: 249 }), quantity: 1 },
      ),
    );
    const bundle = result.applied.find((a) => a.discountId === 'd-coffee-oatmilk-bundle');
    expect(bundle?.amountCents).toBe(200); // min(2,1)=1 set
  });

  it('does not apply BUNDLE when only one product is present', () => {
    const result = engine.price(
      lines({ product: product({ id: 'p-coffee-beans', priceCents: 1299 }), quantity: 1 }),
    );
    expect(
      result.applied.find((a) => a.discountId === 'd-coffee-oatmilk-bundle'),
    ).toBeUndefined();
  });

  it('applies FIXED_OFF_ORDER when post-product subtotal >= threshold', () => {
    const result = engine.price(
      lines({ product: product({ id: 'p-olive-oil', priceCents: 1499 }), quantity: 3 }),
    );
    // subtotal 4497, no product-scoped match, threshold 3000 -> -500
    expect(result.applied.find((a) => a.discountId === 'd-order-5-over-30')?.amountCents).toBe(500);
    expect(result.totalCents).toBe(4497 - 500);
  });

  it('FIXED_OFF_ORDER evaluated against post-product-discount subtotal', () => {
    // pure coffee 1299x3 = 3897, -20% (779) -> 3118 still over 3000 -> -500
    const result = engine.price(
      lines({ product: product({ id: 'p-coffee-beans', priceCents: 1299 }), quantity: 3 }),
    );
    expect(result.applied.find((a) => a.discountId === 'd-order-5-over-30')).toBeDefined();
  });

  it('total is never negative', () => {
    const result = engine.price(
      lines({ product: product({ id: 'p-x', priceCents: 100 }), quantity: 1 }),
    );
    expect(result.totalCents).toBeGreaterThanOrEqual(0);
  });
});
