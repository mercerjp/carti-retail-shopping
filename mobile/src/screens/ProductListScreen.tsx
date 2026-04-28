import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api';
import { useCart } from '../CartContext';
import { formatGBP } from '../format';
import { RootStackParamList } from '../navigation';
import { Product } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;

export function ProductListScreen({ navigation }: Props) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { cart } = useCart();

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.listProducts();
      setProducts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load products');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('Cart')}
          accessibilityRole="button"
          accessibilityLabel="View cart"
        >
          <Text style={styles.cartLink}>Cart{cart ? ` (${cartCount(cart.lines)})` : ''}</Text>
        </Pressable>
      ),
    });
  }, [navigation, cart]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (!products && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={load} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={products ?? []}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.price}>{formatGBP(item.priceCents)}</Text>
            <Text style={item.stock === 0 ? styles.oos : styles.stock}>
              {item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

function cartCount(lines: { quantity: number }[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 16, gap: 12 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowPressed: { backgroundColor: '#f3f4f6' },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  price: { fontSize: 16 },
  stock: { color: '#16a34a' },
  oos: { color: '#b91c1c', fontWeight: '600' },
  error: { color: '#b91c1c', textAlign: 'center', marginBottom: 12 },
  retry: { padding: 12 },
  retryText: { color: '#2563eb', fontWeight: '600' },
  cartLink: { color: '#2563eb', fontWeight: '600', marginRight: 8 },
});
