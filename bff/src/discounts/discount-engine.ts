import { Injectable } from '@nestjs/common';
import { Product } from '../products/product.entity';
import { Discount } from './discount.entity';
import { DiscountsService } from './discounts.service';

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface AppliedDiscount {
  discountId: string;
  name: string;
  amountCents: number;
}

export interface PricingResult {
  subtotalCents: number;
  applied: AppliedDiscount[];
  discountTotalCents: number;
  totalCents: number;
}

/**
 * Pure pricing engine. Given lines + active discounts, compute subtotal, apply each
 * discount, and return a deterministic breakdown.
 *
 * Order of application matters for FIXED_OFF_ORDER (it's evaluated against the
 * post-product-discount subtotal), so product-scoped promos run before order-scoped ones.
 */
@Injectable()
export class DiscountEngine {
  constructor(private readonly discounts: DiscountsService) {}

  price(lines: CartLine[]): PricingResult {
    const subtotalCents = lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);

    const active = this.discounts.active();
    const applied: AppliedDiscount[] = [];

    const productScoped = active.filter(
      (d) =>
        d.kind === 'PERCENT_OFF_PRODUCT' || d.kind === 'BUY_X_GET_Y_FREE' || d.kind === 'BUNDLE',
    );
    const orderScoped = active.filter((d) => d.kind === 'FIXED_OFF_ORDER');

    for (const d of productScoped) {
      const amount = this.evaluate(d, lines);
      if (amount > 0) {
        applied.push({ discountId: d.id, name: d.name, amountCents: amount });
      }
    }

    const productDiscountTotal = applied.reduce((s, a) => s + a.amountCents, 0);
    const postProductSubtotal = subtotalCents - productDiscountTotal;

    for (const d of orderScoped) {
      const amount = this.evaluateOrderScoped(d, postProductSubtotal);
      if (amount > 0) {
        applied.push({ discountId: d.id, name: d.name, amountCents: amount });
      }
    }

    const discountTotalCents = applied.reduce((s, a) => s + a.amountCents, 0);
    const totalCents = Math.max(0, subtotalCents - discountTotalCents);

    return { subtotalCents, applied, discountTotalCents, totalCents };
  }

  private evaluate(d: Discount, lines: CartLine[]): number {
    switch (d.kind) {
      case 'PERCENT_OFF_PRODUCT': {
        const line = lines.find((l) => l.product.id === d.productId);
        if (!line) return 0;
        const lineTotal = line.product.priceCents * line.quantity;
        return Math.round((lineTotal * d.percent) / 100);
      }
      case 'BUY_X_GET_Y_FREE': {
        const line = lines.find((l) => l.product.id === d.productId);
        if (!line) return 0;
        const groupSize = d.buyQuantity + d.freeQuantity;
        const freeUnits = Math.floor(line.quantity / groupSize) * d.freeQuantity;
        return freeUnits * line.product.priceCents;
      }
      case 'BUNDLE': {
        const allPresent = d.productIds.every((pid) =>
          lines.some((l) => l.product.id === pid && l.quantity > 0),
        );
        if (!allPresent) return 0;
        const sets = Math.min(
          ...d.productIds.map((pid) => {
            const line = lines.find((l) => l.product.id === pid);
            return line ? line.quantity : 0;
          }),
        );
        return sets * d.amountCents;
      }
      default:
        return 0;
    }
  }

  private evaluateOrderScoped(d: Discount, subtotalCents: number): number {
    if (d.kind !== 'FIXED_OFF_ORDER') return 0;
    if (subtotalCents < d.minSubtotalCents) return 0;
    return Math.min(d.amountCents, subtotalCents);
  }
}
