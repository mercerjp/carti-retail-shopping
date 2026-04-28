import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

interface EnrichedLine {
  product: Product;
  quantity: number;
}

export function CartScreen({ navigation }: Props) {
  const { cart, error, loading, updateItem, removeItem, clear, expiredNotice, dismissExpiredNotice } =
    useCart();
  const [lines, setLines] = useState<EnrichedLine[] | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    if (!cart) {
      setLines([]);
      return;
    }
    setResolveError(null);
    try {
      const products = await Promise.all(cart.lines.map((l) => api.getProduct(l.productId)));
      setLines(
        cart.lines.map((l, i) => ({ product: products[i], quantity: l.quantity })),
      );
    } catch (e) {
      setResolveError(e instanceof Error ? e.message : 'Could not load cart contents');
    }
  }, [cart]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  const onCheckout = async () => {
    if (!cart) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const order = await api.checkout(cart.id);
      // Navigate first, THEN clear — otherwise the empty-cart branch flashes between
      // the state update and the route change.
      navigation.replace('Checkout', { order });
      clear();
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const banner = expiredNotice ? (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>{expiredNotice}</Text>
      <Pressable
        onPress={dismissExpiredNotice}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Text style={styles.bannerDismiss}>Dismiss</Text>
      </Pressable>
    </View>
  ) : null;

  if (!cart || (lines && lines.length === 0)) {
    return (
      <View style={styles.container}>
        {banner}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
          <Pressable onPress={() => navigation.navigate('ProductList')}>
            <Text style={styles.link}>Browse products</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!lines && !resolveError) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={theme.colors.ink} />
      </View>
    );
  }

  if (resolveError) {
    return (
      <View style={styles.empty}>
        <Text style={styles.error}>{resolveError}</Text>
        <Pressable onPress={resolve}>
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const subtotalCents = (lines ?? []).reduce(
    (s, l) => s + l.product.priceCents * l.quantity,
    0,
  );

  return (
    <View style={styles.container}>
      {banner}
      <FlatList
        data={lines ?? []}
        keyExtractor={(l) => l.product.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.product.name}</Text>
              <Text style={styles.unit}>
                {formatGBP(item.product.priceCents)} each
              </Text>
            </View>
            <View style={styles.qtyControls}>
              <Pressable
                onPress={() => updateItem(item.product.id, item.quantity - 1)}
                style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
                accessibilityLabel="Decrease quantity"
                disabled={loading || item.quantity <= 1}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable
                onPress={() => updateItem(item.product.id, item.quantity + 1)}
                style={[styles.qtyBtn, item.product.stock <= 0 && styles.qtyBtnDisabled]}
                accessibilityLabel="Increase quantity"
                disabled={loading || item.product.stock <= 0}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => removeItem(item.product.id)}
              accessibilityLabel="Remove item"
              disabled={loading}
            >
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotal}>{formatGBP(subtotalCents)}</Text>
        </View>
        <Text style={styles.note}>Discounts apply automatically at checkout.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        {checkoutError && <Text style={styles.error}>{checkoutError}</Text>}
        <Pressable
          onPress={onCheckout}
          disabled={checkingOut || loading}
          style={({ pressed }) => [
            styles.checkoutBtn,
            (checkingOut || loading) && styles.disabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Check out"
        >
          <Text style={styles.checkoutText}>
            {checkingOut ? 'Processing…' : 'Check out'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.canvas,
  },
  emptyText: { ...theme.typography.h2 },
  link: { color: theme.colors.accent, fontWeight: '700' },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  name: { ...theme.typography.h2, fontSize: 15 },
  unit: { ...theme.typography.caption, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: theme.colors.ink },
  qtyBtnDisabled: { opacity: 0.35, borderColor: theme.colors.disabled },
  qty: { width: 24, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  remove: { color: theme.colors.danger, fontWeight: '700' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  subtotalLabel: { ...theme.typography.body, fontWeight: '600' },
  subtotal: { ...theme.typography.h1 },
  note: { ...theme.typography.caption, color: theme.colors.textMuted },
  error: { color: theme.colors.danger },
  checkoutBtn: {
    backgroundColor: theme.colors.ink,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  pressed: { backgroundColor: theme.colors.borderStrong, opacity: 0.9 },
  disabled: { backgroundColor: theme.colors.disabled },
  checkoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  banner: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  bannerText: { flex: 1, color: '#78350f', fontSize: 14 },
  bannerDismiss: { color: '#78350f', fontWeight: '700' },
});
