import { AppliedDiscount } from '../discounts/discount-engine';

export interface OrderLine {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface OrderSummary {
  orderId: string;
  cartId: string;
  placedAt: string;
  lines: OrderLine[];
  subtotalCents: number;
  discounts: AppliedDiscount[];
  discountTotalCents: number;
  totalCents: number;
  currency: 'GBP';
}
