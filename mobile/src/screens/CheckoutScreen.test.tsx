import { render } from '@testing-library/react-native';
import React from 'react';
import { OrderSummary } from '../types';
import { CheckoutScreen } from './CheckoutScreen';

const baseOrder: OrderSummary = {
  orderId: 'o-12345678abcdef',
  cartId: 'c-1',
  placedAt: '2026-04-28T16:00:00.000Z',
  lines: [
    {
      productId: 'p-coffee-beans',
      name: 'Coffee Beans',
      unitPriceCents: 1299,
      quantity: 2,
      lineTotalCents: 2598,
    },
  ],
  subtotalCents: 2598,
  discounts: [{ discountId: 'd-coffee-20', name: '20% off coffee', amountCents: 520 }],
  discountTotalCents: 520,
  totalCents: 2078,
  currency: 'GBP',
};

function makeProps(order: OrderSummary | null) {
  const navigation = { navigate: jest.fn(), popToTop: jest.fn() } as never;
  const route = { key: 'k', name: 'Checkout', params: order ? { order } : undefined } as never;
  return { navigation, route };
}

describe('CheckoutScreen', () => {
  it('renders the order summary with discounts and total', () => {
    const { getByText } = render(<CheckoutScreen {...makeProps(baseOrder)} />);
    expect(getByText(/Order confirmed/)).toBeTruthy();
    expect(getByText(/Coffee Beans/)).toBeTruthy();
    expect(getByText(/20% off coffee/)).toBeTruthy();
    expect(getByText(/£20\.78/)).toBeTruthy(); // total
  });

  it('renders a recovery message when no order is provided', () => {
    const { getByText } = render(<CheckoutScreen {...makeProps(null)} />);
    expect(getByText(/Missing order summary/)).toBeTruthy();
  });
});
