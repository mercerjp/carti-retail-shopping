import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
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
import { Product } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addItem, error: cartError, loading } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getProduct(productId)
      .then((p) => !cancelled && setProduct(p))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load'));
    return () => {
      cancelled = true;
    };
  }, [productId]);

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
        <ActivityIndicator />
      </View>
    );
  }

  const onAdd = async () => {
    setAdding(true);
    setAdded(false);
    await addItem(product.id, 1);
    setAdding(false);
    setAdded(true);
  };

  const outOfStock = product.stock === 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.category}>{product.category}</Text>
      <Text style={styles.price}>{formatGBP(product.priceCents)}</Text>
      <Text style={styles.description}>{product.description}</Text>
      <Text style={outOfStock ? styles.oos : styles.stock}>
        {outOfStock ? 'Out of stock' : `${product.stock} in stock`}
      </Text>

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

      {cartError && <Text style={styles.error}>{cartError}</Text>}
      {added && !cartError && (
        <Pressable onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.viewCart}>Added — view cart</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  name: { fontSize: 24, fontWeight: '700' },
  category: { color: '#6b7280', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  price: { fontSize: 22, fontWeight: '600' },
  description: { fontSize: 15, lineHeight: 22, color: '#374151' },
  stock: { color: '#16a34a' },
  oos: { color: '#b91c1c', fontWeight: '600' },
  btn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnPressed: { backgroundColor: '#374151' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#b91c1c', textAlign: 'center' },
  viewCart: { color: '#2563eb', textAlign: 'center', fontWeight: '600' },
});
