import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { CartScreen } from './CartScreen';
import { RootStackParamList } from '../navigation';

// Mock useCart so we can drive expiredNotice + dismissExpiredNotice directly,
// without standing up the real provider/ticker.
jest.mock('../CartContext', () => ({
  useCart: jest.fn(),
}));
jest.mock('../api', () => require('../__mocks__/api'));

import { useCart } from '../CartContext';

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

const Stack = createNativeStackNavigator<RootStackParamList>();

const Harness = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Cart" component={CartScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

function setCart(overrides: Partial<ReturnType<typeof useCart>> = {}) {
  const dismiss = jest.fn();
  mockUseCart.mockReturnValue({
    cart: null,
    loading: false,
    error: null,
    expiresAt: null,
    secondsRemaining: 0,
    expiredNotice: null,
    createCart: jest.fn(),
    refresh: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    dismissExpiredNotice: dismiss,
    ...overrides,
  } as ReturnType<typeof useCart>);
  return { dismiss };
}

describe('CartScreen expiry banner', () => {
  beforeEach(() => {
    mockUseCart.mockReset();
  });

  const NOTICE = 'Your cart expired after 2 minutes of inactivity — we started a fresh one.';

  it('renders no banner when expiredNotice is null', async () => {
    setCart({ expiredNotice: null });
    const { queryByText } = render(<Harness />);
    await waitFor(() => expect(queryByText(NOTICE)).toBeNull());
  });

  it('shows the expiry banner when expiredNotice is set, and dismisses on tap', async () => {
    const { dismiss } = setCart({ expiredNotice: NOTICE });
    const { findByText, getByLabelText } = render(<Harness />);
    expect(await findByText(NOTICE)).toBeTruthy();

    fireEvent.press(getByLabelText('Dismiss'));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
