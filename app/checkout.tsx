import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../components/AppDialogProvider';
import { useSession } from '../context/SessionProvider';
import { Address, getDefaultAddress } from '../services/address';
import { CartItem, getCartItems } from '../services/cart';
import { getKYCStatus } from '../services/kyc';
import { createOrder } from '../services/orders';
import { getProductById } from '../services/products';

export default function CheckoutScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { showDialog } = useAppDialog();
  const params = useLocalSearchParams();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStockAvailable, setIsStockAvailable] = useState(true);
  const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { selectedItemIds } = params;
      if (!session || !selectedItemIds || typeof selectedItemIds !== 'string') {
        setIsLoading(false);
        return;
      }

      try {
        // Check KYC verification status
        const kycStatus = await getKYCStatus(session.uid);
        
        if (kycStatus.status !== 'verified') {
          setIsLoading(false);
          // Immediately redirect back - don't allow access to checkout
          router.back();
          // Show alert after redirect
          setTimeout(() => {
            showDialog({
              title: 'Verification Required',
              message: 'Please complete KYC verification before you can checkout.',
              confirmText: 'Verify Now',
              cancelText: 'Cancel',
              onConfirm: () => router.push('/kyc'),
            });
          }, 100);
          return;
        }

        // Fetch cart items
        const allCartItems = await getCartItems(session.uid);
        const idsToFetch = new Set(JSON.parse(selectedItemIds));
        const selected = allCartItems.filter((item) => idsToFetch.has(item.id));
        
        console.log('🛒 Selected cart items for checkout:', selected);
        
        // Validate stock by fetching current product data from Firestore
        let stockAvailable = true;
        const itemsWithCurrentStock: CartItem[] = [];
        const outOfStock: string[] = [];
        
        for (const item of selected) {
          try {
            // Fetch current product data to get real-time stock
            const currentProduct = await getProductById(item.productId);
            
            if (!currentProduct) {
              console.warn(`⚠️ Product ${item.productId} not found`);
              stockAvailable = false;
              outOfStock.push(`${item.name} (Product not found)`);
              itemsWithCurrentStock.push(item);
              continue;
            }
            
            // Check if product has enough stock for the cart quantity
            if (currentProduct.stock < item.quantity) {
              console.warn(`⚠️ Insufficient stock for ${item.name}: need ${item.quantity}, available ${currentProduct.stock}`);
              stockAvailable = false;
              outOfStock.push(`${item.name} (Need ${item.quantity}, only ${currentProduct.stock} available)`);
            }
            
            // Update item with current stock for display
            itemsWithCurrentStock.push({
              ...item,
              stock: currentProduct.stock
            });
          } catch (error) {
            console.error(`❌ Error fetching product ${item.productId}:`, error);
            stockAvailable = false;
            outOfStock.push(`${item.name} (Error checking stock)`);
            itemsWithCurrentStock.push(item);
          }
        }
        
        setItems(itemsWithCurrentStock);
        setOutOfStockItems(outOfStock);
        console.log('📦 Current stock values:', itemsWithCurrentStock.map(item => ({ name: item.name, cartQty: item.quantity, availableStock: item.stock })));
        console.log('✅ Stock available?', stockAvailable);
        setIsStockAvailable(stockAvailable);
        
        // Fetch default address
        const defaultAddress = await getDefaultAddress(session.uid);
        setAddress(defaultAddress);
      } catch (error) {
        showDialog({ title: 'Error', message: 'Could not load checkout data.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session, params.selectedItemIds]);

  // Refresh address when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshAddress = async () => {
        if (session) {
          try {
            const defaultAddress = await getDefaultAddress(session.uid);
            setAddress(defaultAddress);
          } catch (error) {
            console.error('Error refreshing address:', error);
          }
        }
      };
      
      refreshAddress();
    }, [session])
  );

  const handlePlaceOrder = async () => {
    if (!session?.uid || items.length === 0) {
      showDialog({ title: 'Error', message: 'Cannot place order. Please try again.' });
      return;
    }

    if (!address) {
      showDialog({
        title: 'Error',
        message: 'Please add a delivery address before placing your order.',
      });
      return;
    }

    setIsPlacingOrder(true);
    try {
      const newOrderId = await createOrder(
        session.uid, 
        items, 
        totalPrice,
        address?.id, // Pass address ID
        'cash', // Default payment method
        'delivery', // Default order type
        subtotal,
        shippingFee,
        taxAmount
      );
      // Navigate to the new payment screen with the order ID
      router.replace({ pathname: '/payment', params: { orderId: newOrderId } });
    } catch (error) {
      console.error(error);
      showDialog({
        title: 'Error',
        message: 'Failed to place your order. Please try again.',
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Calculate order totals matching web logic
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const shippingFee = subtotal > 1000 ? 0 : 50; // Free shipping over ₱1000
  const taxRate = 0.12; // 12% VAT
  const taxAmount = subtotal * taxRate;
  const totalPrice = subtotal + shippingFee + taxAmount;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <TouchableOpacity onPress={() => router.push('/address/select')}>
              <Text style={styles.changeAddressLink}>Change Address</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addressContainer}>
            {address ? (
              <>
                <Text style={styles.addressName}>{address.name}</Text>
                <Text style={styles.addressPhone}>{address.phone_number}</Text>
                <Text style={styles.addressText}>
                  {address.house_street}, {address.barangay}
                </Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.province} {address.postal_code}
                </Text>
                {address.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultText}>Default Address</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noAddressContainer}>
                <Text style={styles.addressPlaceholder}>No delivery address found</Text>
                <TouchableOpacity 
                  style={styles.addAddressButton}
                  onPress={() => router.push('/address/add')}
                >
                  <Text style={styles.addAddressText}>Add Address</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemContainer}>
              <Text style={styles.itemName}>
                {item.name} {item.flavor ? `(${item.flavor})` : ''} x {item.quantity}
              </Text>
              <Text style={styles.itemPrice}>₱{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {!isStockAvailable && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            The following items have insufficient stock:
          </Text>
          {outOfStockItems.map((item, index) => (
            <Text key={index} style={styles.errorItemText}>• {item}</Text>
          ))}
          <Text style={styles.errorText}>
            Please adjust quantities or remove items to proceed.
          </Text>
        </View>
      )}
      <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Subtotal</Text>
            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Shipping Fee</Text>
            <Text style={styles.summaryValue}>{shippingFee > 0 ? `₱${shippingFee.toFixed(2)}` : 'FREE'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Tax (12% VAT)</Text>
            <Text style={styles.summaryValue}>₱{taxAmount.toFixed(2)}</Text>
          </View>
          {shippingFee === 0 && (
            <View style={styles.freeShippingNote}>
              <Feather name="truck" size={14} color="#34C759" />
              <Text style={styles.freeShippingText}>Free shipping on orders over ₱1,000!</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total</Text>
            <Text style={styles.summaryTotalPrice}>₱{totalPrice.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.placeOrderButton, (!isStockAvailable || isPlacingOrder) && styles.disabledButton]}
          onPress={handlePlaceOrder} 
          disabled={!isStockAvailable || isPlacingOrder}>
          {!isStockAvailable ? (
            <Text style={styles.placeOrderButtonText}>Out of Stock</Text>
          ) : isPlacingOrder ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderButtonText}>Place Order</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addressContainer: {
    paddingVertical: 8,
  },
  addressText: {
    fontSize: 16,
    marginBottom: 4,
  },
  addressPlaceholder: {
    color: '#d9534f',
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeAddressLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  defaultBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  noAddressContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  addAddressButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  addAddressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 16,
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    padding: 16,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  summaryTotalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
  },
  freeShippingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  freeShippingText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 6,
    fontWeight: '500',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  placeOrderButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffdddd',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: '#d8000c',
    fontSize: 16,
    textAlign: 'center',
  },
  errorItemText: {
    color: '#d8000c',
    fontSize: 14,
    marginVertical: 4,
    paddingLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
