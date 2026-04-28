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
import { theme } from '../theme';
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
        <ActivityIndicator color={theme.colors.ink} />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.canvas,
  },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  rowPressed: { backgroundColor: theme.colors.canvas },
  name: { ...theme.typography.h2, marginBottom: theme.spacing.xs },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { ...theme.typography.price },
  stock: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '600' },
  oos: { ...theme.typography.caption, color: theme.colors.danger, fontWeight: '700' },
  error: { color: theme.colors.danger, textAlign: 'center', marginBottom: theme.spacing.md },
  retry: { padding: theme.spacing.md },
  retryText: { color: theme.colors.accent, fontWeight: '700' },
  cartLink: { color: theme.colors.surface, fontWeight: '700', marginRight: theme.spacing.sm },
});
