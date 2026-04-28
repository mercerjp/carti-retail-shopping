import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { CartProvider } from '../CartContext';
import { RootStackParamList } from '../navigation';
import { resetApiMocks } from '../__mocks__/api';
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

describe('ProductListScreen', () => {
  beforeEach(() => resetApiMocks());

  it('renders catalogue rows including out-of-stock label', async () => {
    const { findByText } = render(<Harness />);
    expect(await findByText('Coffee Beans')).toBeTruthy();
    expect(await findByText('Oat Milk')).toBeTruthy();
    await waitFor(() => expect(findByText(/Out of stock/)).resolves.toBeTruthy());
  });
});
