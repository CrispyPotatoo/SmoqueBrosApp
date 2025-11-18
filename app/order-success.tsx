import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

const OrderSuccessScreen = () => {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Order Successful', headerLeft: () => null }} />
      <View style={styles.content}>
        <Feather name="check-circle" size={80} color="#28a745" />
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>Your order has been placed.</Text>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdLabel}>Order ID:</Text>
          <Text style={styles.orderId}>{orderId}</Text>
        </View>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(tabs)/')}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  orderIdContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 16,
    color: '#555',
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  homeButton: {
    marginTop: 40,
    backgroundColor: '#0074D9',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OrderSuccessScreen;
