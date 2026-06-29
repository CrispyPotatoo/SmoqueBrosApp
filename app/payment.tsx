import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDialog } from '../components/AppDialogProvider';
import { useSession } from '../context/SessionProvider';
import { CartItem, getCartItems } from '../services/cart';
import { createOrder } from '../services/orders';

export default function PaymentScreen() {
  const router = useRouter();
  const { session } = useSession();
  const params = useLocalSearchParams();
  const { showDialog } = useAppDialog();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const { selectedItemIds, subtotal, shippingFee, taxAmount, totalPrice, addressId } = params as {
    selectedItemIds?: string;
    subtotal?: string;
    shippingFee?: string;
    taxAmount?: string;
    totalPrice?: string;
    addressId?: string;
  };

  useEffect(() => {
    const loadItems = async () => {
      if (!session?.uid || !selectedItemIds || typeof selectedItemIds !== 'string') {
        setIsLoading(false);
        return;
      }

      try {
        const allCartItems = await getCartItems(session.uid);
        const ids = new Set<string>(JSON.parse(selectedItemIds));
        const selected = allCartItems.filter(item => ids.has(item.id));
        setItems(selected);
      } catch (error) {
        console.error('Failed to load items for payment:', error);
        showDialog({
          title: 'Error',
          message: 'Failed to load items for payment. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [session?.uid, selectedItemIds]);

  const handleConfirmPayment = async () => {
    if (!session?.uid) {
      showDialog({ title: 'Error', message: 'Please sign in again.' });
      router.replace('/(auth)');
      return;
    }

    if (!items.length) {
      showDialog({
        title: 'Error',
        message: 'No items found for this order. Please start again from your cart.',
      });
      router.replace('/cart');
      return;
    }

    if (!addressId || typeof addressId !== 'string') {
      showDialog({
        title: 'Error',
        message: 'Delivery address is missing. Please go back and select an address.',
      });
      router.replace('/checkout');
      return;
    }

    const subtotalNum = Number(subtotal || 0);
    const shippingNum = Number(shippingFee || 0);
    const taxNum = Number(taxAmount || 0);
    const totalNum = Number(totalPrice || 0);

    setIsPlacingOrder(true);
    try {
      const newOrderId = await createOrder(
        session.uid,
        items,
        totalNum,
        addressId,
        'cash',
        'delivery',
        subtotalNum,
        shippingNum,
        taxNum,
      );

      showDialog({
        title: 'Success',
        message: 'Your order has been placed!',
        confirmText: 'Track Order',
        onConfirm: () => router.replace(`/tracking/${newOrderId}`),
      });
    } catch (error) {
      console.error('Failed to place order from payment screen:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to place your order. Please try again.',
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        <TouchableOpacity style={styles.paymentOption} activeOpacity={0.7}>
          <Feather name="truck" size={24} color="#2c3e50" />
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentName}>Cash on Delivery (COD)</Text>
            <Text style={styles.paymentDescription}>Pay when you receive your order</Text>
          </View>
          <Feather name="check-circle" size={24} color="#27ae60" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, (isLoading || isPlacingOrder) && styles.confirmButtonDisabled]}
          onPress={handleConfirmPayment}
          disabled={isLoading || isPlacingOrder}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm and Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  paymentDetails: {
    flex: 1,
    marginLeft: 16,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  infoText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
