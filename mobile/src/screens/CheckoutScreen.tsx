import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatGBP } from '../format';
import { RootStackParamList } from '../navigation';

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
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Discounts applied</Text>
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
  container: { padding: 24, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  orderId: { color: '#6b7280' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 14, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineName: { fontSize: 15, flex: 1 },
  lineTotal: { fontSize: 15 },
  muted: { color: '#6b7280' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 15 },
  discountName: { color: '#16a34a', flex: 1 },
  discountAmount: { color: '#16a34a' },
  grandRow: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 },
  grandLabel: { fontSize: 18, fontWeight: '700' },
  grandValue: { fontSize: 18, fontWeight: '700' },
  btn: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPressed: { backgroundColor: '#374151' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#b91c1c' },
  link: { color: '#2563eb', fontWeight: '600' },
});
