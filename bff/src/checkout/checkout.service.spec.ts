import { BadRequestException } from '@nestjs/common';
import { CartsService } from '../carts/carts.service';
import { DiscountEngine } from '../discounts/discount-engine';
import { DiscountsService } from '../discounts/discounts.service';
import { ProductsService } from '../products/products.service';
import { CheckoutService } from './checkout.service';

describe('CheckoutService', () => {
  let products: ProductsService;
  let carts: CartsService;
  let checkout: CheckoutService;

  beforeEach(() => {
    products = new ProductsService();
    carts = new CartsService(products);
    const discounts = new DiscountsService();
    checkout = new CheckoutService(carts, products, new DiscountEngine(discounts));
  });

  afterEach(() => {
    carts.onModuleDestroy();
  });

  it('completes a successful checkout, returns order summary, leaves stock decremented', () => {
    const cart = carts.create();
    const before = products.get('p-coffee-beans').stock;
    carts.addItem(cart.id, 'p-coffee-beans', 1);
    carts.addItem(cart.id, 'p-oat-milk', 1);

    const order = checkout.checkout(cart.id);
    expect(order.lines).toHaveLength(2);
    expect(order.totalCents).toBeGreaterThan(0);
    expect(order.discounts.length).toBeGreaterThan(0); // bundle + percent should fire
    expect(products.get('p-coffee-beans').stock).toBe(before - 1);

    // Cart is now checked out.
    expect(() => checkout.checkout(cart.id)).toThrow(BadRequestException);
  });

  it('rejects checkout of an empty cart', () => {
    const cart = carts.create();
    expect(() => checkout.checkout(cart.id)).toThrow(BadRequestException);
  });

  it('rejects checkout of a cart that has expired', () => {
    const cart = carts.create();
    carts.addItem(cart.id, 'p-coffee-beans', 1);
    carts.sweepExpired(Date.now() + 10 * 60 * 1000);
    expect(() => checkout.checkout(cart.id)).toThrow(BadRequestException);
  });
});
