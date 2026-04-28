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
});
