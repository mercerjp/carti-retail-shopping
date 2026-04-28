/**
 * Discount engine types. Four kinds of promotion are supported, each documented in SOLUTION.md.
 *
 * - PERCENT_OFF_PRODUCT: e.g. 20% off coffee beans
 * - FIXED_OFF_ORDER: e.g. £5 off when subtotal >= £30
 * - BUY_X_GET_Y_FREE: e.g. buy 2 oat milks, get 1 free (cheapest among the matching items is free)
 * - BUNDLE: e.g. coffee + oat milk together = £2 off
 */
export type DiscountKind =
  | 'PERCENT_OFF_PRODUCT'
  | 'FIXED_OFF_ORDER'
  | 'BUY_X_GET_Y_FREE'
  | 'BUNDLE';

interface DiscountBase {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface PercentOffProductDiscount extends DiscountBase {
  kind: 'PERCENT_OFF_PRODUCT';
  productId: string;
  percent: number; // 0-100
}

export interface FixedOffOrderDiscount extends DiscountBase {
  kind: 'FIXED_OFF_ORDER';
  minSubtotalCents: number;
  amountCents: number;
}

export interface BuyXGetYFreeDiscount extends DiscountBase {
  kind: 'BUY_X_GET_Y_FREE';
  productId: string;
  buyQuantity: number;
  freeQuantity: number;
}

export interface BundleDiscount extends DiscountBase {
  kind: 'BUNDLE';
  productIds: string[]; // all must be present (qty >= 1) to qualify
  amountCents: number;
}

export type Discount =
  | PercentOffProductDiscount
  | FixedOffOrderDiscount
  | BuyXGetYFreeDiscount
  | BundleDiscount;
