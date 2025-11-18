import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSession } from '../../context/SessionProvider';
import { Order, OrderStatus, getOrdersByUserId } from '../../services/orders';
import { Feather } from '@expo/vector-icons';

const OrderHistoryScreen = () => {
  const { session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.uid) {
      getOrdersByUserId(session.uid)
        .then(setOrders)
        .catch(err => console.error('Failed to fetch orders:', err))
        .finally(() => setIsLoading(false));
    }
  }, [session]);

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => router.push(`/tracking/${item.id}`)}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{item.id.substring(0, 8)}...</Text>
        <Text style={styles.orderDate}>{ 
          new Date(item.createdAt?.toDate()).toLocaleDateString()
        }</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.totalPrice}>₱{(item.total || item.total_amount || 0).toFixed(2)}</Text>
        <Text style={[styles.status, statusStyles[item.status]]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return <ActivityIndicator style={styles.centered} size="large" color="#000" />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My Orders' }} />
      {orders.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="shopping-bag" size={40} color="#ccc" />
          <Text style={styles.emptyText}>You have no orders yet.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const statusStyles: Record<OrderStatus, { backgroundColor: string, color: string }> = {
  Pending: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  Processing: { backgroundColor: '#E0F7FA', color: '#006064' },
  Shipped: { backgroundColor: '#E3F2FD', color: '#0D47A1' },
  Delivered: { backgroundColor: '#E8F5E9', color: '#1B5E20' },
  Cancelled: { backgroundColor: '#FFEBEE', color: '#B71C1C' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#888',
  },
  listContainer: {
    padding: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    textTransform: 'capitalize',
    overflow: 'hidden',
  },

});

export default OrderHistoryScreen;
