import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { ReactNode } from 'react';
import { CartProvider, useCart } from './CartContext';
import { api, resetApiMocks } from './__mocks__/api';

jest.mock('./api', () => require('./__mocks__/api'));

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

describe('CartContext', () => {
  beforeEach(() => {
    resetApiMocks();
  });

  it('starts with no cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.cart).toBeNull();
  });

  it('mints a cart only on the first addItem (lazy)', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addItem('p-coffee-beans', 1);
    });
    expect(api.createCart).toHaveBeenCalledTimes(1);
    expect(api.addItem).toHaveBeenCalledWith('cart-1', 'p-coffee-beans', 1);
    await waitFor(() => expect(result.current.cart?.lines).toHaveLength(1));
  });

  it('does not mint two carts under concurrent addItem calls', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await Promise.all([
        result.current.addItem('p-coffee-beans', 1),
        result.current.addItem('p-coffee-beans', 1),
      ]);
    });
    expect(api.createCart).toHaveBeenCalledTimes(1);
  });

  it('clears state on clear()', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addItem('p-coffee-beans', 1);
    });
    act(() => result.current.clear());
    expect(result.current.cart).toBeNull();
  });

  it('accumulates quantity when the same product is added twice', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addItem('p-coffee-beans', 2);
    });
    await act(async () => {
      await result.current.addItem('p-coffee-beans', 1);
    });
    expect(result.current.cart?.lines).toHaveLength(1);
    expect(result.current.cart?.lines[0].quantity).toBe(3);
  });

  it('surfaces api errors via context.error', async () => {
    api.addItem.mockRejectedValueOnce(new Error('Insufficient stock'));
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(async () => {
      await result.current.addItem('p-coffee-beans', 999);
    });
    expect(result.current.error).toMatch(/Insufficient stock/);
  });

  describe('cart expiry UX', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('proactive expiry: ticker observes Date.now() >= expiresAt', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useCart(), { wrapper });

      await act(async () => {
        await result.current.addItem('p-coffee-beans', 1);
      });
      expect(api.createCart).toHaveBeenCalledTimes(1);
      const firstCartId = result.current.cart?.id;
      expect(firstCartId).toBe('cart-1');

      // Advance just past the 2-minute TTL — the ticker should fire expiry.
      await act(async () => {
        jest.advanceTimersByTime(121_000);
      });
      // Flush the createCart() promise queued by handleExpiry.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.expiredNotice).toMatch(/expired/i);
      expect(api.createCart).toHaveBeenCalledTimes(2);
      // After auto-recreate the new cart should be set.
      expect(result.current.cart?.id).toBe('cart-2');
    });

    it('reactive expiry: a mutation rejecting with /is expired/ triggers the same effects', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      await act(async () => {
        await result.current.addItem('p-coffee-beans', 1);
      });
      expect(api.createCart).toHaveBeenCalledTimes(1);

      api.addItem.mockRejectedValueOnce(new Error('Cart cart-1 is expired'));

      await act(async () => {
        await result.current.addItem('p-coffee-beans', 1);
      });
      // Flush createCart() promise from handleExpiry.
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.expiredNotice).toMatch(/expired/i);
      expect(result.current.error).toBeNull();
      expect(api.createCart).toHaveBeenCalledTimes(2);
      expect(result.current.cart?.id).toBe('cart-2');
    });

    it('proactive + reactive firing together still mints exactly one new cart', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useCart(), { wrapper });
      await act(async () => {
        await result.current.addItem('p-coffee-beans', 1);
      });
      expect(api.createCart).toHaveBeenCalledTimes(1);

      // Suspend the next createCart so the in-flight ref stays set while both
      // expiry paths fire — this is the actual concurrency the dedupe protects.
      let releaseCreate!: (cart: import('../src/types').Cart | any) => void;
      const pending = new Promise((resolve) => {
        releaseCreate = resolve;
      });
      api.createCart.mockImplementationOnce(() => pending as any);

      // Reactive path: addItem rejects with expired -> handleExpiry fires.
      api.addItem.mockRejectedValueOnce(new Error('Cart cart-1 is expired'));

      // Fire proactive (ticker) and reactive (addItem) within the same act —
      // the suspended createCart guarantees they overlap.
      await act(async () => {
        jest.advanceTimersByTime(121_000);
        await result.current.addItem('p-coffee-beans', 1);
      });

      // While the in-flight createCart is still pending, the second handleExpiry
      // call must NOT have started a third createCart.
      expect(api.createCart).toHaveBeenCalledTimes(2);

      // Now release: still only 2 total.
      await act(async () => {
        releaseCreate({
          id: 'cart-2',
          status: 'active',
          lines: [],
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 120_000,
        });
        await Promise.resolve();
      });
      expect(api.createCart).toHaveBeenCalledTimes(2);
    });

    it('secondsRemaining decreases by 1 each fake-timer tick', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useCart(), { wrapper });
      await act(async () => {
        await result.current.addItem('p-coffee-beans', 1);
      });
      const start = result.current.secondsRemaining;
      expect(start).toBeGreaterThan(0);

      await act(async () => {
        jest.advanceTimersByTime(1_000);
      });
      expect(result.current.secondsRemaining).toBe(start - 1);

      await act(async () => {
        jest.advanceTimersByTime(1_000);
      });
      expect(result.current.secondsRemaining).toBe(start - 2);
    });

    it('dismissExpiredNotice() clears expiredNotice', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      await act(async () => {
        await result.current.addItem('p-coffee-beans', 1);
      });
      api.addItem.mockRejectedValueOnce(new Error('Cart cart-1 is expired'));
      await act(async () => {
        await result.current.addItem('p-coffee-beans', 1);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.expiredNotice).toMatch(/expired/i);

      act(() => result.current.dismissExpiredNotice());
      expect(result.current.expiredNotice).toBeNull();
    });
  });
});
