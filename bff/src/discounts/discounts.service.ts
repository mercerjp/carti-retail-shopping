import { Injectable, NotFoundException } from '@nestjs/common';
import { Discount } from './discount.entity';
import { DISCOUNT_SEED } from './discounts.seed';

@Injectable()
export class DiscountsService {
  private readonly discounts = new Map<string, Discount>();

  constructor() {
    DISCOUNT_SEED.forEach((d) => this.discounts.set(d.id, { ...d }));
  }

  list(): Discount[] {
    return Array.from(this.discounts.values())
      .filter((d) => d.active)
      .map((d) => ({ ...d }));
  }

  get(id: string): Discount {
    const d = this.discounts.get(id);
    if (!d) throw new NotFoundException(`Discount ${id} not found`);
    return { ...d };
  }

  /** Returns active discounts for the engine to evaluate against a cart. */
  active(): Discount[] {
    return Array.from(this.discounts.values()).filter((d) => d.active);
  }
}
