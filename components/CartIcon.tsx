import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';

interface CartIconProps {
  color: string;
  size: number;
}

export const CartIcon: React.FC<CartIconProps> = ({ color, size }) => {
  const { itemCount } = useCart();

  return (
    <View style={styles.container}>
      <Feather name="shopping-cart" color={color} size={size} />
      {itemCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {itemCount > 99 ? '99+' : itemCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
