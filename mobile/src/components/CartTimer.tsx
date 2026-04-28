import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCart } from '../CartContext';

export function CartTimer() {
  const { cart, secondsRemaining } = useCart();
  if (!cart) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const lowTime = secondsRemaining <= 30;

  return (
    <View style={styles.container}>
      <Text
        style={[styles.text, lowTime && styles.textLow]}
        accessibilityLabel={`Cart expires in ${minutes} minutes ${seconds} seconds`}
      >
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: '#374151',
  },
  textLow: {
    color: '#b91c1c',
  },
});
