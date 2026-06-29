import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAppDialog } from '../../components/AppDialogProvider';
import { db } from '../../constants/firebaseConfig';
import { useSession } from '../../context/SessionProvider';
import { getUserAddresses } from '../../services/address';
import {
  CartItem,
  removeFromCart,
  updateCartItemQuantity
} from '../../services/cart';
import { getKYCStatus } from '../../services/kyc';
import { getProductById } from '../../services/products';

export default function CartScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { showDialog } = useAppDialog();
  const [items, setItems] = useState<CartItem[]>([]);
  const [itemsWithStock, setItemsWithStock] = useState<Map<string, number>>(new Map());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingQuantities, setEditingQuantities] = useState<Map<string, string>>(new Map());

  // Real-time cart items listener
  useEffect(() => {
    if (!session?.uid) {
      setItems([]);
      setSelectedItems(new Set());
      setIsLoading(false);
      return;
    }

    console.log('🔥 Setting up real-time cart listener for user:', session.uid);
    setIsLoading(true);
    setError(null);

    // Use subcollection structure: carts/{userId}/items
    const userCartRef = doc(db, 'carts', session.uid);
    const cartItemsRef = collection(userCartRef, 'items');

    const unsubscribe = onSnapshot(cartItemsRef, async (snapshot) => {
      console.log('🔥 Real-time cart update:', snapshot.size, 'items');

      const cartItems: CartItem[] = [];
      const stockMap = new Map<string, number>();

      snapshot.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        cartItems.push({
          id: doc.id,
          productId: data.product_id || '',
          name: data.name || '',
          price: Number(data.price) || 0,
          description: '',
          category: '',
          imageUrl: data.image || '',
          stock: 0,
          sizes: [],
          colors: [],
          flavors: [],
          rating: 0,
          reviews: 0,
          quantity: Number(data.quantity) || 0,
          flavor: data.flavor || '',
        } as CartItem);
      });

      // Fetch current stock for each item and check if archived
      const validCartItems: CartItem[] = [];
      for (const item of cartItems) {
        try {
          const product = await getProductById(item.productId);
          if (product) {
            // Check if product is archived by fetching the raw Firestore document
            const productRef = doc(db, 'products', item.productId);
            const productDoc = await getDoc(productRef);

            if (productDoc.exists()) {
              const productData = productDoc.data();
              const isArchived = productData.archived === true ||
                productData.archived === 'true' ||
                productData.archived === 1 ||
                (productData.archived !== undefined && productData.archived !== false && productData.archived !== 'false' && productData.archived !== 0);

              if (isArchived) {
                console.log(`🗑️ Removing archived product from cart: ${item.name} (${item.productId})`);
                // Remove archived product from cart
                try {
                  await removeFromCart(session.uid, item.id);
                } catch (removeError) {
                  console.error(`Error removing archived product from cart:`, removeError);
                }
                continue; // Skip this item
              }

              stockMap.set(item.id, product.stock);
              validCartItems.push(item);
            } else {
              // Product doesn't exist, remove from cart
              console.log(`🗑️ Removing non-existent product from cart: ${item.name} (${item.productId})`);
              try {
                await removeFromCart(session.uid, item.id);
              } catch (removeError) {
                console.error(`Error removing non-existent product from cart:`, removeError);
              }
            }
          } else {
            // Product not found, but keep item for now (might be temporary issue)
            validCartItems.push(item);
          }
        } catch (error) {
          console.error(`Error fetching product for ${item.productId}:`, error);
          // Keep item in cart if we can't verify (might be temporary network issue)
          validCartItems.push(item);
        }
      }

      setItems(validCartItems);
      setItemsWithStock(stockMap);
      setIsLoading(false);

      // Clear selected items that no longer exist
      setSelectedItems(prev => {
        const newSet = new Set<string>();
        prev.forEach(itemId => {
          if (validCartItems.some(item => item.id === itemId)) {
            newSet.add(itemId);
          }
        });
        return newSet;
      });
    }, (error) => {
      console.error('❌ Real-time cart listener error:', error);
      setError('Failed to load cart items.');
      setIsLoading(false);
    });

    return () => {
      console.log('🔥 Cleaning up real-time cart listener');
      unsubscribe();
    };
  }, [session?.uid]);

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)));
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!session) return;
    try {
      console.log('🗑️ Removing item from cart:', itemId);
      await removeFromCart(session.uid, itemId);
      // Real-time listener will automatically update the UI
    } catch (e) {
      console.error('❌ Failed to remove item:', e);
      showDialog({ title: 'Error', message: 'Failed to remove item from cart.' });
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (!session) return;

    // Only check stock when INCREASING quantity
    const currentStock = itemsWithStock.get(itemId) || 0;
    const item = items.find(i => i.id === itemId);

    if (item && newQuantity > item.quantity && newQuantity > currentStock) {
      showDialog({
        title: 'Insufficient Stock',
        message: `Only ${currentStock} item(s) available for ${item.name}.`,
      });
      return;
    }

    try {
      console.log('📝 Updating quantity for item:', itemId, 'to:', newQuantity);
      await updateCartItemQuantity(session.uid, itemId, newQuantity);
      // Real-time listener will automatically update the UI
    } catch (e) {
      console.error('❌ Failed to update quantity:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to update item quantity.';
      showDialog({ title: 'Error', message: errorMessage });
    }
  };

  const handleCheckout = async () => {
    const selectedCartItems = items.filter((item) => selectedItems.has(item.id));
    if (selectedCartItems.length === 0) {
      showDialog({
        title: 'No Items Selected',
        message: 'Please select items to checkout.',
      });
      return;
    }

    if (!session?.uid) {
      showDialog({ title: 'Error', message: 'Please sign in to continue.' });
      return;
    }

    // Check if any selected items exceed stock
    const itemsExceedingStock = selectedCartItems.filter(item => {
      const currentStock = itemsWithStock.get(item.id) || 0;
      return item.quantity > currentStock;
    });

    if (itemsExceedingStock.length > 0) {
      const itemNames = itemsExceedingStock.map(item => item.name).join(', ');
      showDialog({
        title: 'Stock Exceeded',
        message: `The following items exceed available stock: ${itemNames}. Please adjust quantities before checkout.`,
      });
      return;
    }

    try {
      // Check KYC verification status
      const kycStatus = await getKYCStatus(session.uid);

      if (kycStatus.status !== 'verified') {
        showDialog({
          title: 'Verification Required',
          message: 'Please complete KYC verification before you can checkout.',
          confirmText: 'Verify Now',
          cancelText: 'Cancel',
          onConfirm: () => router.push('/kyc'),
        });
        return;
      }

      // Check if user has at least one address
      const userAddresses = await getUserAddresses(session.uid);

      if (userAddresses.length === 0) {
        showDialog({
          title: 'Address Required',
          message: 'Please add a delivery address before you can checkout.',
          confirmText: 'Add Address',
          cancelText: 'Cancel',
          onConfirm: () => router.push('/address/add'),
        });
        return;
      }

      // All checks passed, proceed to checkout
      const selectedIds = Array.from(selectedItems);
      router.push({
        pathname: '/checkout',
        params: { selectedItemIds: JSON.stringify(selectedIds) }
      });
    } catch (error) {
      console.error('Checkout validation error:', error);
      showDialog({
        title: 'Error',
        message: 'Could not validate checkout requirements. Please try again.',
      });
    }
  };

  const { totalPrice, selectedCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    items.forEach((item) => {
      if (selectedItems.has(item.id)) {
        total += Number(item.price || 0) * Number(item.quantity || 0);
        count++;
      }
    });
    return { totalPrice: total, selectedCount: count };
  }, [items, selectedItems]);

  // Remove the old fetchCartItems and useFocusEffect since we now use real-time listeners

  const renderContent = () => {
    if (!session) {
      return <Text style={styles.placeholderText}>Please log in to view your cart.</Text>;
    }
    if (isLoading) {
      return <ActivityIndicator style={styles.centered} size="large" color="#000" />;
    }
    if (error) {
      return <Text style={styles.placeholderText}>{error}</Text>;
    }
    if (items.length === 0) {
      return <Text style={styles.placeholderText}>Your cart is empty.</Text>;
    }

    console.log('📱 Rendering items with ScrollView:', items.length, items.map(i => ({ id: i.id, name: i.name })));

    return (
      <ScrollView style={styles.listContent}>
        {items.map((item, index) => {
          console.log('🎨 Rendering item:', index, item.id, item.name);
          return (
            <View key={`${item.id}-${index}`} style={styles.itemContainer}>
              <TouchableOpacity onPress={() => handleSelectItem(item.id)} style={styles.checkbox}>
                <Feather
                  name={selectedItems.has(item.id) ? 'check-square' : 'square'}
                  size={24}
                  color={selectedItems.has(item.id) ? '#d9534f' : '#ccc'}
                />
              </TouchableOpacity>
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.flavor && (
                  <Text style={styles.itemFlavor}>Flavor: {item.flavor}</Text>
                )}
                <Text style={styles.itemPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
                {(() => {
                  const currentStock = itemsWithStock.get(item.id) || 0;
                  if (item.quantity > currentStock) {
                    return (
                      <View style={styles.stockWarning}>
                        <Feather name="alert-circle" size={14} color="#d9534f" />
                        <Text style={styles.stockWarningText}>
                          Only {currentStock} available
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      item.quantity <= 1 && styles.quantityButtonDisabled
                    ]}
                    onPress={() => {
                      // Clear editing state
                      setEditingQuantities(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(item.id);
                        return newMap;
                      });
                      handleUpdateQuantity(item.id, item.quantity - 1);
                    }}
                    disabled={item.quantity <= 1}
                  >
                    <Feather
                      name="minus"
                      size={16}
                      color={item.quantity <= 1 ? '#ccc' : '#333'}
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={editingQuantities.get(item.id) ?? item.quantity.toString()}
                    onChangeText={(text) => {
                      // Update local editing state immediately for responsiveness
                      setEditingQuantities(prev => {
                        const newMap = new Map(prev);
                        newMap.set(item.id, text);
                        return newMap;
                      });
                    }}
                    onBlur={() => {
                      // When user finishes editing, validate and update
                      const editedValue = editingQuantities.get(item.id);
                      if (editedValue !== undefined) {
                        const value = parseInt(editedValue) || 0;
                        if (value === 0) {
                          // Remove item if quantity is set to 0
                          handleRemoveItem(item.id);
                        } else if (value !== item.quantity) {
                          // Update quantity if it changed
                          handleUpdateQuantity(item.id, value);
                        }
                        // Clear editing state
                        setEditingQuantities(prev => {
                          const newMap = new Map(prev);
                          newMap.delete(item.id);
                          return newMap;
                        });
                      }
                    }}
                    onSubmitEditing={() => {
                      // Same logic as onBlur when user presses enter/done
                      const editedValue = editingQuantities.get(item.id);
                      if (editedValue !== undefined) {
                        const value = parseInt(editedValue) || 0;
                        if (value === 0) {
                          handleRemoveItem(item.id);
                        } else if (value !== item.quantity) {
                          handleUpdateQuantity(item.id, value);
                        }
                        setEditingQuantities(prev => {
                          const newMap = new Map(prev);
                          newMap.delete(item.id);
                          return newMap;
                        });
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      item.quantity >= (itemsWithStock.get(item.id) || 0) && styles.quantityButtonDisabled
                    ]}
                    onPress={() => {
                      // Clear editing state
                      setEditingQuantities(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(item.id);
                        return newMap;
                      });
                      handleUpdateQuantity(item.id, item.quantity + 1);
                    }}
                    disabled={item.quantity >= (itemsWithStock.get(item.id) || 0)}
                  >
                    <Feather
                      name="plus"
                      size={16}
                      color={item.quantity >= (itemsWithStock.get(item.id) || 0) ? '#ccc' : '#333'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleRemoveItem(item.id)}
              >
                <Feather name="trash-2" size={20} color="#d9534f" />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderContent()}

      {items.length > 0 && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllButton}>
            <Feather
              name={selectedItems.size === items.length ? 'check-square' : 'square'}
              size={20}
              color="#000"
            />
            <Text style={styles.selectAllText}>
              Select All ({selectedCount})
            </Text>
            <Text style={styles.totalText}>Total: ₱{totalPrice.toFixed(2)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.checkoutButton, selectedCount === 0 && styles.disabledButton]}
            onPress={handleCheckout}
            disabled={selectedCount === 0}
          >
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
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
  placeholderText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    marginTop: 50,
  },
  listContent: {
    flex: 1,
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemFlavor: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#d9534f',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  quantityInput: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  stockWarningText: {
    color: '#d9534f',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  deleteButton: {
    marginLeft: 12,
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalText: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d9534f',
  },
  checkoutButton: {
    backgroundColor: '#d9534f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
