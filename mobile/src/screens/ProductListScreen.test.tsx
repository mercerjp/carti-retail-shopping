import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { CartProvider } from '../CartContext';
import { RootStackParamList } from '../navigation';
import { Product } from '../types';
import { api, mockProducts, resetApiMocks } from '../__mocks__/api';
import { ProductListScreen } from './ProductListScreen';

jest.mock('../api', () => require('../__mocks__/api'));

const Stack = createNativeStackNavigator<RootStackParamList>();

const Harness = () => (
  <CartProvider>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="ProductList" component={ProductListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  </CartProvider>
);

const Filler = () => (
  <View>
    <Text>Other Screen</Text>
  </View>
);

describe('ProductListScreen', () => {
  beforeEach(() => resetApiMocks());

  it('renders catalogue rows including out-of-stock label', async () => {
    const { findByText } = render(<Harness />);
    expect(await findByText('Coffee Beans')).toBeTruthy();
    expect(await findByText('Oat Milk')).toBeTruthy();
    await waitFor(() => expect(findByText(/Out of stock/)).resolves.toBeTruthy());
  });

  it('refetches products when the screen regains focus', async () => {
    const first: Product[] = [{ ...mockProducts[0], stock: 5 }];
    const second: Product[] = [{ ...mockProducts[0], stock: 4 }];
    (api.listProducts as jest.Mock)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);

    const navRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

    const FocusHarness = () => (
      <CartProvider>
        <NavigationContainer ref={navRef}>
          <Stack.Navigator>
            <Stack.Screen name="ProductList" component={ProductListScreen} />
            {/* Cast to any so we can stash a generic filler screen without
                widening RootStackParamList in production code. */}
            <Stack.Screen name={'Filler' as any} component={Filler as any} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    );

    const { findByText } = render(<FocusHarness />);

    expect(await findByText('5 in stock')).toBeTruthy();
    expect(api.listProducts).toHaveBeenCalledTimes(1);

    // Navigate away then back to fire a focus event on ProductList.
    await act(async () => {
      navRef.current?.navigate('Filler' as any);
    });
    await act(async () => {
      navRef.current?.goBack();
    });

    await waitFor(() => expect(api.listProducts).toHaveBeenCalledTimes(2));
    expect(await findByText('4 in stock')).toBeTruthy();
  });
});
