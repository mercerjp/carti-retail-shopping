import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { CartProvider } from '../CartContext';
import { RootStackParamList } from '../navigation';
import { api, resetApiMocks } from '../__mocks__/api';
import { ProductDetailScreen } from './ProductDetailScreen';

jest.mock('../api', () => require('../__mocks__/api'));

const Stack = createNativeStackNavigator<RootStackParamList>();

const Harness = ({ productId }: { productId: string }) => (
  <CartProvider>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          initialParams={{ productId }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  </CartProvider>
);

describe('ProductDetailScreen', () => {
  beforeEach(() => resetApiMocks());

  it('renders product details and adds to cart on tap', async () => {
    const { findByText, getByLabelText } = render(<Harness productId="p-coffee-beans" />);
    expect(await findByText('Coffee Beans')).toBeTruthy();
    expect(await findByText(/Single-origin/)).toBeTruthy();

    fireEvent.press(getByLabelText('Add to cart'));

    await waitFor(() => expect(api.createCart).toHaveBeenCalledTimes(1));
    expect(api.addItem).toHaveBeenCalledWith('cart-1', 'p-coffee-beans', 1);
  });

  it('decreases displayed stock when Add to cart is pressed', async () => {
    const baseProduct = {
      id: 'p-coffee-beans',
      name: 'Coffee Beans',
      description: 'Single-origin coffee.',
      category: 'pantry',
      priceCents: 1299,
      stock: 10,
    };
    api.getProduct
      .mockResolvedValueOnce(baseProduct)
      .mockResolvedValueOnce({ ...baseProduct, stock: 9 });

    const { findByText, getByLabelText } = render(<Harness productId="p-coffee-beans" />);
    expect(await findByText('10 in stock')).toBeTruthy();

    fireEvent.press(getByLabelText('Add to cart'));

    await waitFor(() => expect(api.addItem).toHaveBeenCalledTimes(1));
    expect(await findByText('9 in stock')).toBeTruthy();
    expect(api.getProduct).toHaveBeenCalledTimes(2);
  });

  it('reconciles displayed stock when Add to cart fails', async () => {
    const baseProduct = {
      id: 'p-coffee-beans',
      name: 'Coffee Beans',
      description: 'Single-origin coffee.',
      category: 'pantry',
      priceCents: 1299,
      stock: 10,
    };
    api.getProduct
      .mockResolvedValueOnce(baseProduct)
      .mockResolvedValueOnce({ ...baseProduct, stock: 10 });
    api.addItem.mockRejectedValueOnce(new Error('Insufficient stock'));

    const { findByText, getByLabelText } = render(<Harness productId="p-coffee-beans" />);
    expect(await findByText('10 in stock')).toBeTruthy();

    fireEvent.press(getByLabelText('Add to cart'));

    // Optimistic decrement flips to 9, then refetch reconciles back to 10.
    await waitFor(() => expect(api.getProduct).toHaveBeenCalledTimes(2));
    expect(await findByText('10 in stock')).toBeTruthy();
    // Button is no longer stuck in the "Adding…" state.
    expect(await findByText('Add to cart')).toBeTruthy();
  });

  it('disables Add to cart when product is out of stock', async () => {
    const { findByText, getByLabelText } = render(<Harness productId="p-oat-milk" />);
    expect(await findByText('Oat Milk')).toBeTruthy();
    const button = getByLabelText('Add to cart');
    fireEvent.press(button);
    // Pressing a disabled button shouldn't trigger the api
    await new Promise((r) => setTimeout(r, 0));
    expect(api.createCart).not.toHaveBeenCalled();
    expect(api.addItem).not.toHaveBeenCalled();
  });
});
