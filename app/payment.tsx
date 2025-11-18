import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../components/AppDialogProvider';

export default function PaymentScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { showDialog } = useAppDialog();

  const handleConfirmPayment = () => {
    if (typeof orderId !== 'string') {
      showDialog({
        title: 'Error',
        message: 'Could not find order details. Please try again.',
      });
      router.replace('/(tabs)/');
      return;
    }
    // For a real app, this is where you would integrate a payment gateway.
    // For this project, we'll simulate a successful payment.
    showDialog({ title: 'Success', message: 'Your order has been placed!' });
    router.replace(`/tracking/${orderId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment</Text>
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

        <Text style={styles.infoText}>
          More payment options (e.g., Credit Card, GCash) would be integrated here in a real-world application.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmPayment}>
          <Text style={styles.confirmButtonText}>Confirm and Place Order</Text>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
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
