import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatGBP } from '../format';
import { RootStackParamList } from '../navigation';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export function CheckoutScreen({ route, navigation }: Props) {
  const order = route.params?.order;

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Missing order summary.</Text>
        <Pressable onPress={() => navigation.navigate('ProductList')}>
          <Text style={styles.link}>Back to products</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Order confirmed</Text>
      <Text style={styles.orderId}>Order #{order.orderId.slice(0, 8)}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.lines.map((line) => (
          <View key={line.productId} style={styles.lineRow}>
            <Text style={styles.lineName}>
              {line.name} <Text style={styles.muted}>× {line.quantity}</Text>
            </Text>
            <Text style={styles.lineTotal}>{formatGBP(line.lineTotalCents)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatGBP(order.subtotalCents)}</Text>
        </View>

        {order.discounts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: theme.spacing.md }]}>
              Discounts applied
            </Text>
            {order.discounts.map((d) => (
              <View key={d.discountId} style={styles.lineRow}>
                <Text style={styles.discountName}>{d.name}</Text>
                <Text style={styles.discountAmount}>−{formatGBP(d.amountCents)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount total</Text>
              <Text style={styles.totalValue}>−{formatGBP(order.discountTotalCents)}</Text>
            </View>
          </>
        )}

        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Total paid</Text>
          <Text style={styles.grandValue}>{formatGBP(order.totalCents)}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => navigation.popToTop()}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityRole="button"
      >
        <Text style={styles.btnText}>Back to shop</Text>
      </Pressable>
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
    gap: theme.spacing.md,
    backgroundColor: theme.colors.canvas,
  },
  title: { ...theme.typography.display },
  orderId: { ...theme.typography.caption, color: theme.colors.textMuted },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  sectionTitle: { ...theme.typography.label, marginBottom: theme.spacing.sm },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  lineName: { ...theme.typography.body, flex: 1 },
  lineTotal: { ...theme.typography.body },
  muted: { color: theme.colors.textMuted },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  totalLabel: { ...theme.typography.body },
  totalValue: { ...theme.typography.body },
  discountName: { color: theme.colors.success, flex: 1, fontWeight: '600' },
  discountAmount: { color: theme.colors.success, fontWeight: '600' },
  grandRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  grandLabel: { ...theme.typography.h1, fontSize: 18 },
  grandValue: { ...theme.typography.h1, fontSize: 20, color: theme.colors.accent },
  btn: {
    backgroundColor: theme.colors.ink,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  btnPressed: { backgroundColor: theme.colors.borderStrong, opacity: 0.9 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  error: { color: theme.colors.danger },
  link: { color: theme.colors.accent, fontWeight: '700' },
});
