import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { CartsService } from '../carts/carts.service';
import { DiscountEngine } from '../discounts/discount-engine';
import { ProductsService } from '../products/products.service';
import { OrderLine, OrderSummary } from './order.entity';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly carts: CartsService,
    private readonly products: ProductsService,
    private readonly engine: DiscountEngine,
  ) {}

  /**
   * Checkout flow:
   *  1. Reload cart (also runs the expiry sweep — an idle cart fails fast).
   *  2. Verify each line still resolves to a known product. Stock is already reserved
   *     (we decremented at add-to-cart time), so we don't re-check inventory here —
   *     the reservation IS the guarantee. If the cart is empty, fail with a clear message.
   *  3. Price the cart through the discount engine (auto-applies qualifying promos).
   *  4. Mark the cart checked out so reservations are not released back to inventory
   *     (the items have been "purchased" — stock stays decremented).
   *  5. Build and return the order summary.
   *
   * Failure surface area is small because reservations make checkout near-deterministic:
   * the only realistic failures are an unknown cart, an empty cart, or an already-completed cart.
   */
  checkout(cartId: string): OrderSummary {
    const cart = this.carts.get(cartId); // sweeps expiry; throws if expired/checked_out
    if (cart.status !== 'active') {
      throw new BadRequestException(`Cart ${cartId} is ${cart.status} — start a new cart`);
    }
    if (cart.lines.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const enrichedLines = cart.lines.map((line) => {
      const product = this.products.get(line.productId);
      return { product, quantity: line.quantity };
    });

    const pricing = this.engine.price(enrichedLines);

    // The reservation has already taken stock out of inventory. Marking the cart as
    // checked-out finalises the sale — we don't release the reservation back.
    this.carts.markCheckedOut(cartId);

    const orderLines: OrderLine[] = enrichedLines.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      quantity,
      lineTotalCents: product.priceCents * quantity,
    }));

    return {
      orderId: uuid(),
      cartId,
      placedAt: new Date().toISOString(),
      lines: orderLines,
      subtotalCents: pricing.subtotalCents,
      discounts: pricing.applied,
      discountTotalCents: pricing.discountTotalCents,
      totalCents: pricing.totalCents,
      currency: 'GBP',
    };
  }
}
