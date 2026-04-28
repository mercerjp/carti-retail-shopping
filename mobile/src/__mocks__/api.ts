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

export const api = {
  listProducts: jest.fn().mockResolvedValue(mockProducts),
  getProduct: jest.fn().mockImplementation(async (id: string) => {
    const found = mockProducts.find((p) => p.id === id);
    if (!found) throw new Error(`not found: ${id}`);
    return found;
  }),
  createCart: jest.fn().mockImplementation(async () => {
    const cart: Cart = {
      id: `cart-${nextCartId++}`,
      status: 'active',
      lines: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    return cart;
  }),
  getCart: jest.fn(),
  addItem: jest.fn().mockImplementation(async (cartId: string, productId: string, quantity: number) => {
    const cart: Cart = {
      id: cartId,
      status: 'active',
      lines: [{ productId, quantity }],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    return cart;
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
}
