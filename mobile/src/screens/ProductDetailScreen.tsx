import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addItem, error: cartError, loading, expiredNotice } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      const p = await api.getProduct(productId);
      setProduct(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.ink} />
      </View>
    );
  }

  const onAdd = async () => {
    setAdding(true);
    setAdded(false);
    setProduct((p) => (p ? { ...p, stock: Math.max(0, p.stock - 1) } : p));
    await addItem(product.id, 1);
    setAdding(false);
    setAdded(true);
    void loadProduct();
  };

  const outOfStock = product.stock === 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>{formatGBP(product.priceCents)}</Text>
        <Text style={styles.description}>{product.description}</Text>
        <Text style={outOfStock ? styles.oos : styles.stock}>
          {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
        </Text>
      </View>

      <Pressable
        onPress={onAdd}
        disabled={outOfStock || adding || loading}
        style={({ pressed }) => [
          styles.btn,
          (outOfStock || adding) && styles.btnDisabled,
          pressed && !outOfStock && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add to cart"
      >
        <Text style={styles.btnText}>
          {adding ? 'Adding…' : outOfStock ? 'Out of stock' : 'Add to cart'}
        </Text>
      </Pressable>

      {expiredNotice ? (
        <Text style={styles.notice}>Cart expired — we started a fresh one. Try adding again.</Text>
      ) : (
        cartError && <Text style={styles.error}>{cartError}</Text>
      )}
      {added && !cartError && !expiredNotice && (
        <Pressable onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.viewCart}>Added — view cart</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.canvas,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.canvas,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  name: { ...theme.typography.display },
  category: { ...theme.typography.label },
  price: { ...theme.typography.price, fontSize: 22 },
  description: { ...theme.typography.body, color: theme.colors.textSecondary },
  stock: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '700' },
  oos: { ...theme.typography.caption, color: theme.colors.danger, fontWeight: '700' },
  btn: {
    backgroundColor: theme.colors.ink,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  btnPressed: { backgroundColor: theme.colors.borderStrong, opacity: 0.9 },
  btnDisabled: { backgroundColor: theme.colors.disabled },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  error: { color: theme.colors.danger, textAlign: 'center' },
  viewCart: { color: theme.colors.accent, textAlign: 'center', fontWeight: '700' },
  notice: { color: '#78350f', textAlign: 'center' },
});
