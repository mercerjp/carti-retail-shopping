export type CartStatus = 'active' | 'checked_out' | 'expired';

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  status: CartStatus;
  lines: CartLine[];
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
}
