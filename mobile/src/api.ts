import Constants from 'expo-constants';
import { Cart, OrderSummary, Product } from './types';

function resolveBaseUrl(): string {
  // Priority: explicit env > expoConfig.extra > localhost fallback (mostly for tests).
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  if (extra?.apiBaseUrl) return extra.apiBaseUrl;
  return 'http://localhost:3000/api';
}

export const API_BASE_URL = resolveBaseUrl();

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    const message =
      (body as { message?: string | string[] } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new ApiError(Array.isArray(message) ? message.join('; ') : message, res.status);
  }
  return body as T;
}

export const api = {
  listProducts: () => request<Product[]>('/products'),
  getProduct: (id: string) => request<Product>(`/products/${id}`),
  createCart: () => request<Cart>('/carts', { method: 'POST' }),
  getCart: (id: string) => request<Cart>(`/carts/${id}`),
  addItem: (cartId: string, productId: string, quantity: number) =>
    request<Cart>(`/carts/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    }),
  updateItem: (cartId: string, productId: string, quantity: number) =>
    request<Cart>(`/carts/${cartId}/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeItem: (cartId: string, productId: string) =>
    request<Cart>(`/carts/${cartId}/items/${productId}`, { method: 'DELETE' }),
  checkout: (cartId: string) =>
    request<OrderSummary>(`/carts/${cartId}/checkout`, { method: 'POST' }),
};

export { ApiError };
