export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  stock: number;
  imageUrl?: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export type CartStatus = 'active' | 'checked_out' | 'expired';

export interface Cart {
  id: string;
  status: CartStatus;
  lines: CartLine[];
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
}

export interface AppliedDiscount {
  discountId: string;
  name: string;
  amountCents: number;
}

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
