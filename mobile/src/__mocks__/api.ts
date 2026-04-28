import { Cart, OrderSummary, Product } from '../types';

export const mockProducts: Product[] = [
  {
    id: 'p-coffee-beans',
    name: 'Coffee Beans',
    description: 'Single-origin coffee.',
    category: 'pantry',
    priceCents: 1299,
    stock: 10,
  },
  {
    id: 'p-oat-milk',
    name: 'Oat Milk',
    description: 'Creamy.',
    category: 'dairy-alt',
    priceCents: 249,
    stock: 0,
  },
];

let nextCartId = 1;
const cartStore = new Map<string, Cart>();

function makeCart(id: string): Cart {
  return {
    id,
    status: 'active',
    lines: [],
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    expiresAt: Date.now() + 2 * 60 * 1000,
  };
}

export const api = {
  listProducts: jest.fn().mockResolvedValue(mockProducts),
  getProduct: jest.fn().mockImplementation(async (id: string) => {
    const found = mockProducts.find((p) => p.id === id);
    if (!found) throw new Error(`not found: ${id}`);
    return found;
  }),
  createCart: jest.fn().mockImplementation(async () => {
    const id = `cart-${nextCartId++}`;
    const cart = makeCart(id);
    cartStore.set(id, cart);
    return { ...cart, lines: [...cart.lines] };
  }),
  getCart: jest.fn().mockImplementation(async (id: string) => {
    const c = cartStore.get(id);
    if (!c) throw new Error(`Cart ${id} not found`);
    return { ...c, lines: c.lines.map((l) => ({ ...l })) };
  }),
  addItem: jest
    .fn()
    .mockImplementation(async (cartId: string, productId: string, quantity: number) => {
      const c = cartStore.get(cartId) ?? makeCart(cartId);
      const existing = c.lines.find((l) => l.productId === productId);
      if (existing) existing.quantity += quantity;
      else c.lines.push({ productId, quantity });
      cartStore.set(cartId, c);
      return { ...c, lines: c.lines.map((l) => ({ ...l })) };
    }),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
  checkout: jest.fn().mockImplementation(async (cartId: string): Promise<OrderSummary> => ({
    orderId: 'o-test',
    cartId,
    placedAt: new Date().toISOString(),
    lines: [
      {
        productId: 'p-coffee-beans',
        name: 'Coffee Beans',
        unitPriceCents: 1299,
        quantity: 1,
        lineTotalCents: 1299,
      },
    ],
    subtotalCents: 1299,
    discounts: [{ discountId: 'd-coffee-20', name: '20% off coffee', amountCents: 260 }],
    discountTotalCents: 260,
    totalCents: 1039,
    currency: 'GBP',
  })),
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function resetApiMocks(): void {
  Object.values(api).forEach((fn) => {
    if (jest.isMockFunction(fn)) fn.mockClear();
  });
  nextCartId = 1;
  cartStore.clear();
}
