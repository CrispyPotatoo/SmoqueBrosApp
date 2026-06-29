import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDialog } from '../components/AppDialogProvider';
import { useSession } from '../context/SessionProvider';
import { Order, getOrdersByUserId } from '../services/orders';
import { hasUserReviewedProduct } from '../services/reviews';

// Available status filters (no generic "All" chip; default view shows all orders)
const FILTERS: Array<Order['status']> = ['Preparing', 'Processing', 'Shipped', 'Completed', 'Cancelled'];

const getStatusStyle = (status: string) => {
  const statusLower = status?.toLowerCase() || '';

  switch (statusLower) {
    case 'preparing':
      return { backgroundColor: '#FFF8E1', color: '#F57F17' };
    case 'processing':
      return { backgroundColor: '#E0F7FA', color: '#006064' };
    case 'shipped':
      return { backgroundColor: '#E3F2FD', color: '#0D47A1' };
    case 'completed':
      return { backgroundColor: '#E8F5E9', color: '#1B5E20' };
    case 'cancelled':
      return { backgroundColor: '#FFEBEE', color: '#B71C1C' };
    default:
      return { backgroundColor: '#F5F5F5', color: '#666' };
  }
};

export default function OrdersScreen() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const { showDialog } = useAppDialog();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Order['status'] | null>(null);
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!session?.uid) return;
    setIsOrdersLoading(true);
    try {
      const userOrders = await getOrdersByUserId(session.uid);
      setOrders(userOrders);

      const reviewed = new Set<string>();
      const completedOrders = userOrders.filter(
        (order) => order.status?.toLowerCase() === 'completed'
      );

      for (const order of completedOrders) {
        for (const item of order.items) {
          if (item.productId) {
            const hasReviewed = await hasUserReviewedProduct(session.uid, item.productId);
            if (hasReviewed) {
              reviewed.add(item.productId);
            }
          }
        }
      }

      setReviewedProducts(reviewed);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      showDialog({ title: 'Error', message: 'Could not fetch your orders.' });
    } finally {
      setIsOrdersLoading(false);
    }
  }, [session?.uid]);

  useEffect(() => {
    if (session) {
      fetchOrders();
    }
  }, [fetchOrders, session]);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        fetchOrders();
      }
    }, [fetchOrders, session])
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color="#000" style={styles.centered} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'My Orders',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.push('/you')} style={{ paddingHorizontal: 12 }}>
                <Feather name="arrow-left" size={22} color="#000" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centered}>
          <Text style={styles.signInText}>Please sign in to view your orders</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredOrders = activeFilter
    ? orders.filter(
        (order) => order.status?.toLowerCase() === activeFilter.toLowerCase()
      )
    : orders;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Orders',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.push('/you')} style={{ paddingHorizontal: 12 }}>
              <Feather name="arrow-left" size={22} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.inlineHeader}>
          <TouchableOpacity onPress={() => router.push('/you')} style={styles.inlineBackButton}>
            <Feather name="arrow-left" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.inlineHeaderTitle}>My Orders</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filter Orders</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
          >
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Orders</Text>
            <Text style={styles.ordersCount}>
              {filteredOrders.length === 1
                ? '1 result'
                : `${filteredOrders.length} results`}
            </Text>
          </View>

          {isOrdersLoading ? (
            <ActivityIndicator size="large" color="#000" style={{ marginTop: 24 }} />
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name='shopping-bag' size={40} color='#ccc' />
              <Text style={styles.emptyText}>No orders found for this filter.</Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const orderDate = order.created_at?.toDate?.() || order.createdAt?.toDate?.() || new Date();
              const totalAmount = order.total_amount || order.total || 0;

              return (
                <View key={order.id} style={styles.orderWrapper}>
                  <TouchableOpacity
                    style={styles.orderCard}
                    onPress={() => router.push(`/tracking/${order.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.orderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <Text style={styles.orderId}>#{order.id.substring(0, 8).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>
                          {orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={styles.orderHeaderRight}>
                        <Text style={styles.orderTotal}>₱{totalAmount.toFixed(2)}</Text>
                        <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
                          <Text style={styles.statusText}>{order.status}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.orderItemsContainer}>
                      {order.items.map((item, index) => (
                        <View key={index} style={styles.orderItemRow}>
                          <View style={styles.orderItemDetails}>
                            <Text style={styles.orderItemName}>{item.name}</Text>
                            {item.flavor && (
                              <Text style={styles.orderItemFlavor}>Flavor: {item.flavor}</Text>
                            )}
                          </View>
                          <View style={styles.orderItemPriceQty}>
                            <Text style={styles.orderItemQuantity}>x{item.quantity}</Text>
                            <Text style={styles.orderItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>

                  {order.status?.toLowerCase() === 'completed' &&
                    order.items.length > 0 &&
                    order.items[0].productId &&
                    !reviewedProducts.has(order.items[0].productId) && (
                      <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => router.push(`/reviews/${order.items[0].productId}`)}
                      >
                        <Feather name="star" size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.reviewButtonText}>Write Review</Text>
                      </TouchableOpacity>
                    )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inlineBackButton: {
    marginRight: 8,
    padding: 4,
  },
  inlineHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  ordersCount: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  filterContainer: {
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  orderWrapper: {
    marginBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderItemsContainer: {
    gap: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderItemDetails: {
    flex: 1,
    marginRight: 12,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 2,
  },
  orderItemFlavor: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  orderItemPriceQty: {
    alignItems: 'flex-end',
  },
  orderItemQuantity: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

