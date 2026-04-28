import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/CartContext';
import { CartTimer } from './src/components/CartTimer';
import { RootStackParamList } from './src/navigation';
import { CartScreen } from './src/screens/CartScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { ProductDetailScreen } from './src/screens/ProductDetailScreen';
import { ProductListScreen } from './src/screens/ProductListScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="ProductList"
              component={ProductListScreen}
              options={{ title: 'Shop' }}
            />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ title: 'Product', headerRight: () => <CartTimer /> }}
            />
            <Stack.Screen
              name="Cart"
              component={CartScreen}
              options={{ title: 'Your cart', headerRight: () => <CartTimer /> }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ title: 'Order summary', headerBackVisible: false }}
            />
          </Stack.Navigator>
          <StatusBar style="auto" />
        </NavigationContainer>
      </CartProvider>
    </SafeAreaProvider>
  );
}
