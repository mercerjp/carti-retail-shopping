import { render } from '@testing-library/react-native';
import React from 'react';
import { Cart } from '../types';
import { CartTimer } from './CartTimer';

// We mock useCart directly so the component can be exercised in isolation
// without standing up CartProvider + the 1-second ticker.
jest.mock('../CartContext', () => ({
  useCart: jest.fn(),
}));

import { useCart } from '../CartContext';

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

function makeCart(overrides: Partial<Cart> = {}): Cart {
  const now = Date.now();
  return {
    id: 'cart-1',
    status: 'active',
    lines: [],
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + 120_000,
    ...overrides,
  };
}

function setCartContext(cart: Cart | null, secondsRemaining: number) {
  mockUseCart.mockReturnValue({
    cart,
    loading: false,
    error: null,
    expiresAt: cart?.expiresAt ?? null,
    secondsRemaining,
    expiredNotice: null,
    createCart: jest.fn(),
    refresh: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    dismissExpiredNotice: jest.fn(),
  } as ReturnType<typeof useCart>);
}

describe('CartTimer', () => {
  beforeEach(() => {
    mockUseCart.mockReset();
  });

  it('returns null when no cart', () => {
    setCartContext(null, 0);
    const { toJSON } = render(<CartTimer />);
    expect(toJSON()).toBeNull();
  });

  it('renders 2:00 when 120 seconds remain', () => {
    setCartContext(makeCart(), 120);
    const { getByText } = render(<CartTimer />);
    expect(getByText('2:00')).toBeTruthy();
  });

  it('pads single-digit seconds (renders 0:09 when 9)', () => {
    setCartContext(makeCart(), 9);
    const { getByText } = render(<CartTimer />);
    expect(getByText('0:09')).toBeTruthy();
  });

  it('exposes an accessibilityLabel describing remaining time', () => {
    setCartContext(makeCart(), 75);
    const { getByLabelText } = render(<CartTimer />);
    expect(getByLabelText('Cart expires in 1 minutes 15 seconds')).toBeTruthy();
  });
});
