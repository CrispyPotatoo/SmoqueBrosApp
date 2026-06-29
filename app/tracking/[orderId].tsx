import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDialog } from '../../components/AppDialogProvider';
import { useSession } from '../../context/SessionProvider';
import { CartItem, addToCart } from '../../services/cart';
import { Order, OrderStatus, getOrderById, updateOrderStatus } from '../../services/orders';
import { getProductById } from '../../services/products';

const OrderDetailScreen = () => {
  const { orderId } = useLocalSearchParams() as { orderId: string };
  const router = useRouter();
  const { session } = useSession();
  const { showDialog } = useAppDialog();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isBuyingAgain, setIsBuyingAgain] = useState(false);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId)
        .then(setOrder)
        .catch(err => console.error('Failed to fetch order details:', err))
        .finally(() => setIsLoading(false));
    }
  }, [orderId]);

  const handleReceiveOrder = async () => {
    if (!order || !session?.uid) return;

    showDialog({
      title: 'Confirm Receipt',
      message: 'Have you received this order?',
      cancelText: 'Cancel',
      confirmText: 'Yes, Received',
      onConfirm: async () => {
        setIsReceiving(true);
        try {
          await updateOrderStatus(order.id, 'Completed');
          showDialog({ title: 'Success', message: 'Order marked as completed!' });
          const updatedOrder = await getOrderById(order.id);
          if (updatedOrder) {
            setOrder(updatedOrder);
          }
        } catch (error) {
          console.error('Failed to mark order as received:', error);
          showDialog({
            title: 'Error',
            message: 'Failed to update order status. Please try again.',
          });
        } finally {
          setIsReceiving(false);
        }
      },
    });
  };

  const handleCancelOrder = () => {
    showDialog({
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order?',
      cancelText: 'No',
      confirmText: 'Yes, Cancel',
      destructive: true,
      onConfirm: async () => {
        setIsCancelling(true);
        try {
          await updateOrderStatus(orderId, 'Cancelled');
          showDialog({
            title: 'Success',
            message: 'Order cancelled successfully',
          });
          const updatedOrder = await getOrderById(orderId);
          setOrder(updatedOrder);
        } catch (error) {
          console.error('Failed to cancel order:', error);
          showDialog({
            title: 'Error',
            message: 'Failed to cancel order. Please try again.',
          });
        } finally {
          setIsCancelling(false);
        }
      },
    });
  };

  const handleBuyAgain = async () => {
    if (!session?.uid || !order) return;

    setIsBuyingAgain(true);
    try {
      // Add all items from the cancelled order back to cart
      const errors: string[] = [];
      
      for (const item of order.items) {
        try {
          // Fetch actual product to get current stock
          const product = await getProductById(item.productId);
          
          if (!product) {
            errors.push(`${item.name}: Product not found`);
            continue;
          }
          
          await addToCart(session.uid, product, item.flavor || null, item.quantity);
        } catch (itemError) {
          const errorMessage = itemError instanceof Error ? itemError.message : 'Unknown error';
          errors.push(`${item.name}: ${errorMessage}`);
        }
      }
      
      if (errors.length > 0) {
        showDialog({
          title: 'Partial Success',
          message: `Some items could not be added:\n\n${errors.join('\n')}`,
          confirmText: 'Go to Cart',
          cancelText: 'OK',
          onConfirm: () => router.push('/cart'),
        });
      } else {
        showDialog({
          title: 'Success',
          message: 'Items added to cart successfully!',
          confirmText: 'Go to Cart',
          cancelText: 'Continue Shopping',
          onConfirm: () => router.push('/cart'),
        });
      }
    } catch (error) {
      console.error('Failed to add items to cart:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add items to cart. Please try again.';
      showDialog({ title: 'Error', message: errorMessage });
    } finally {
      setIsBuyingAgain(false);
    }
  };

  // Normalize status to handle both capitalized and lowercase versions
  const normalizedStatus = order?.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase() : '';
  const canCancelOrder = order && ['preparing', 'processing'].includes(normalizedStatus.toLowerCase());
  const showOrderReceived = order && normalizedStatus.toLowerCase() === 'shipped';
  const showBuyAgain = order && normalizedStatus.toLowerCase() === 'cancelled';

  if (isLoading) {
    return <ActivityIndicator style={styles.centered} size="large" color="#000" />;
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.centered}>
          <Text>Order not found!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <Text style={[styles.status, statusStyles[order.status]]}>{order.status}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order ID</Text>
            <Text style={styles.summaryValue}>#{order.id.substring(0, 8)}...</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Date</Text>
            <Text style={styles.summaryValue}>{new Date(order.createdAt?.toDate()).toLocaleDateString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.listContainer}>
          <FlatList
            data={order.items}
            scrollEnabled={false}
            renderItem={({ item }: { item: CartItem }) => (
              <View style={styles.itemContainer}>
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
                </View>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              </View>
            )}
            keyExtractor={(item) => `${item.id}-${item.name}`}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }}/>}
          />
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>₱{(order.total || order.total_amount || 0).toFixed(2)}</Text>
        </View>

        {showOrderReceived && (
          <TouchableOpacity
            style={[styles.receiveButton, isReceiving && styles.receiveButtonDisabled]}
            onPress={handleReceiveOrder}
            disabled={isReceiving}
          >
            {isReceiving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.receiveButtonText}>Order Received</Text>
            )}
          </TouchableOpacity>
        )}

        {canCancelOrder && (
          <TouchableOpacity
            style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
            onPress={handleCancelOrder}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        )}

        {showBuyAgain && (
          <TouchableOpacity
            style={[styles.buyAgainButton, isBuyingAgain && styles.buyAgainButtonDisabled]}
            onPress={handleBuyAgain}
            disabled={isBuyingAgain}
          >
            {isBuyingAgain ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="shopping-cart" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buyAgainButtonText}>Buy Again</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const statusStyles: Record<OrderStatus, { backgroundColor: string, color?: string }> = {
  Preparing: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  Processing: { backgroundColor: '#E0F7FA', color: '#006064' },
  Shipped: { backgroundColor: '#E3F2FD', color: '#0D47A1' },
  Completed: { backgroundColor: '#E8F5E9', color: '#1B5E20' },
  Cancelled: { backgroundColor: '#FFEBEE', color: '#B71C1C' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#212529',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    padding: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#343a40',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
    color: '#343a40',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  itemPrice: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  totalContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  receiveButton: {
    marginTop: 16,
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  receiveButtonDisabled: {
    opacity: 0.6,
  },
  receiveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buyAgainButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buyAgainButtonDisabled: {
    opacity: 0.6,
  },
  buyAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrderDetailScreen;
