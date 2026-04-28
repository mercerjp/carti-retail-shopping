import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from './api';
import { Cart } from './types';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  createCart: () => Promise<void>;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Single cart per session. We hold the cart id locally so the user keeps the
 * same reservation across screens. On any mutation error we surface the message
 * but keep the cart id intact — the BFF is the source of truth for state.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Holds the in-flight createCart() promise so two rapid addItem taps don't mint two carts.
  const cartCreation = useRef<Promise<Cart> | null>(null);
  const cartRef = useRef<Cart | null>(null);
  cartRef.current = cart;

  const wrap = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCart = useCallback(async () => {
    await wrap(async () => {
      const c = await api.createCart();
      setCart(c);
    });
  }, [wrap]);

  const refresh = useCallback(async () => {
    if (!cart) return;
    await wrap(async () => {
      const c = await api.getCart(cart.id);
      setCart(c);
    });
  }, [cart, wrap]);

  const ensureCart = useCallback(async (): Promise<Cart> => {
    if (cartRef.current) return cartRef.current;
    if (!cartCreation.current) {
      cartCreation.current = api.createCart().then((c) => {
        setCart(c);
        return c;
      });
      cartCreation.current.finally(() => {
        cartCreation.current = null;
      });
    }
    return cartCreation.current;
  }, []);

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      await wrap(async () => {
        const c = await ensureCart();
        const updated = await api.addItem(c.id, productId, quantity);
        setCart(updated);
      });
    },
    [ensureCart, wrap],
  );

  const updateItem = useCallback(
    async (productId: string, quantity: number) => {
      if (!cart) return;
      await wrap(async () => {
        const updated = await api.updateItem(cart.id, productId, quantity);
        setCart(updated);
      });
    },
    [cart, wrap],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      if (!cart) return;
      await wrap(async () => {
        const updated = await api.removeItem(cart.id, productId);
        setCart(updated);
      });
    },
    [cart, wrap],
  );

  const clear = useCallback(() => {
    setCart(null);
    setError(null);
  }, []);

  // Lazy: don't create a cart until the user actually adds an item. Reservations matter.

  const value = useMemo<CartContextValue>(
    () => ({ cart, loading, error, createCart, refresh, addItem, updateItem, removeItem, clear }),
    [cart, loading, error, createCart, refresh, addItem, updateItem, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
