import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';
import { getAddressById } from './address';
import { CartItem } from './cart';

const ORDERS_COLLECTION = 'orders';
const ORDER_ITEMS_COLLECTION = 'order_items';
const CARTS_COLLECTION = 'carts';

export type OrderStatus = 'Preparing' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';

export interface Order {
  id: string;
  user_id: string; // Match admin dashboard field name
  userId?: string; // Keep for backward compatibility
  items: CartItem[];
  total_amount: number; // Match admin dashboard field name
  total?: number; // Keep for backward compatibility
  created_at: any; // Match admin dashboard field name
  createdAt?: any; // Keep for backward compatibility
  status: OrderStatus;
  address_id?: string | number;
  payment_method?: string;
  order_type?: string;
}

export const getOrdersByUserId = async (userId: string): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    
    // First try with new field name (without orderBy to avoid composite index)
    let q = query(ordersRef, where('user_id', '==', userId));
    let querySnapshot = await getDocs(q);
    
    // If no results with new field name, try old field name
    if (querySnapshot.empty) {
      q = query(ordersRef, where('userId', '==', userId));
      querySnapshot = await getDocs(q);
    }
    
    const orders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure backward compatibility
        user_id: data.user_id || data.userId,
        userId: data.userId || data.user_id,
        total_amount: data.total_amount || data.total,
        total: data.total || data.total_amount,
        created_at: data.created_at || data.createdAt,
        createdAt: data.createdAt || data.created_at,
      };
    }) as Order[];

    // Sort by created_at in memory instead of using orderBy
    orders.sort((a, b) => {
      const dateA = a.created_at?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.created_at?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
    });

    console.log(`✅ Fetched ${orders.length} orders for user ${userId}`);
    return orders;
  } catch (error) {
    console.error('❌ Failed to fetch orders:', error);
    throw error;
  }
};

export const subscribeToOrdersByUserId = (
  userId: string,
  onOrders: (orders: Order[]) => void,
  onError?: (error: any) => void,
) => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);

    const mapSnapshotToOrders = (snapshots: Array<any>) => {
      const docsMap = new Map<string, any>();

      snapshots.forEach((snapshot) => {
        if (!snapshot) return;
        snapshot.docs.forEach((doc: any) => {
          docsMap.set(doc.id, doc);
        });
      });

      const orders = Array.from(docsMap.values()).map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          user_id: data.user_id || data.userId,
          userId: data.userId || data.user_id,
          total_amount: data.total_amount || data.total,
          total: data.total || data.total_amount,
          created_at: data.created_at || data.createdAt,
          createdAt: data.createdAt || data.created_at,
        } as Order;
      });

      orders.sort((a, b) => {
        const dateA = a.created_at?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.created_at?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      onOrders(orders);
    };

    const handleError = (error: any) => {
      console.error('❌ Orders subscription error:', error);
      if (onError) onError(error);
    };

    const qNew = query(ordersRef, where('user_id', '==', userId));
    const qOld = query(ordersRef, where('userId', '==', userId));

    let latestNewSnapshot: any = null;
    let latestOldSnapshot: any = null;

    const emitCombined = () => {
      mapSnapshotToOrders([latestNewSnapshot, latestOldSnapshot]);
    };

    const unsubscribeNew = onSnapshot(
      qNew,
      (snapshot) => {
        latestNewSnapshot = snapshot;
        emitCombined();
      },
      handleError,
    );

    const unsubscribeOld = onSnapshot(
      qOld,
      (snapshot) => {
        latestOldSnapshot = snapshot;
        emitCombined();
      },
      handleError,
    );

    return () => {
      unsubscribeNew();
      unsubscribeOld();
    };
  } catch (error) {
    console.error('❌ Failed to subscribe to orders:', error);
    if (onError) onError(error);
    return () => {};
  }
};

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      return null;
    }

    const data = orderDoc.data();
    return { 
      id: orderDoc.id, 
      ...data,
      // Ensure backward compatibility
      user_id: data.user_id || data.userId,
      userId: data.userId || data.user_id,
      total_amount: data.total_amount || data.total,
      total: data.total || data.total_amount,
      created_at: data.created_at || data.createdAt,
      createdAt: data.createdAt || data.created_at,
      items: data.items || [] // Items are stored directly in the order document
    } as Order;
  } catch (error) {
    console.error('❌ Failed to fetch order:', error);
    return null;
  }
};

export const createOrder = async (
  userId: string,
  items: CartItem[],
  total: number,
  addressId?: string,
  paymentMethod: string = 'cash',
  orderType: string = 'delivery',
  subtotal?: number,
  shippingCost?: number,
  taxAmount?: number
): Promise<string> => {
  if (!userId) {
    throw new Error('User is not logged in.');
  }

  // Get user email from Firebase Auth
  const auth = getAuth();
  const userEmail = auth.currentUser?.email || userId;
  
  // Get address details if addressId is provided
  let addressDetails = null;
  if (addressId) {
    addressDetails = await getAddressById(addressId);
  }

  const batch = writeBatch(db);

  // 1. Update stock for each product
  for (const item of items) {
    const productRef = doc(db, 'products', item.productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      throw new Error(`Product with ID ${item.productId} not found.`);
    }

    const currentStock = productDoc.data().stock;
    if (currentStock < item.quantity) {
      throw new Error(`Not enough stock for ${item.name}.`);
    }

    batch.update(productRef, { stock: currentStock - item.quantity });
  }

  // 2. Create the main order document
  const newOrderRef = doc(collection(db, ORDERS_COLLECTION));
  batch.set(newOrderRef, {
    user_id: userId, // Match admin dashboard field name
    userId: userId, // Also include old field name for compatibility
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(), // Also include old field name
    status: 'Preparing', // Initial order status
    total_amount: total, // Match admin dashboard field name
    total: total, // Also include old field name
    subtotal: subtotal || total, // Subtotal before shipping and tax
    shipping_cost: shippingCost || 0, // Shipping fee
    tax_amount: taxAmount || 0, // Tax amount
    address_id: addressId || null, // Match admin dashboard field name
    payment_method: paymentMethod, // Match admin dashboard field name
    order_type: orderType, // Match admin dashboard field name
    items: items.map(item => ({ ...item })), // Storing items directly for backward compatibility
    items_count: items.length, // Add items count for web display
    // Additional fields that might be expected by admin dashboard
    customer_email: userEmail, // User's actual email
    customer_name: addressDetails?.name || 'Customer', // Customer name from address
    customer_phone: addressDetails?.phone_number || '', // Customer phone
    order_date: serverTimestamp(),
    // Complete shipping address details
    shipping_address: addressDetails ? {
      name: addressDetails.name || 'Customer',
      phone: addressDetails.phone_number || '',
      house_street: addressDetails.house_street || '',
      barangay: addressDetails.barangay || '',
      city: addressDetails.city || '',
      province: addressDetails.province || '',
      postal_code: addressDetails.postal_code || '',
      full_address: `${addressDetails.house_street || ''}, ${addressDetails.barangay || ''}, ${addressDetails.city || ''}, ${addressDetails.province || ''} ${addressDetails.postal_code || ''}`
    } : null
  });

  // 3. Create individual order item documents (for admin dashboard)
  for (const item of items) {
    const orderItemRef = doc(collection(db, ORDER_ITEMS_COLLECTION));
    batch.set(orderItemRef, {
      order_id: newOrderRef.id,
      user_id: userId,
      product_id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      flavor: item.flavor || null,
      created_at: serverTimestamp()
    });
  }

  // 4. Clear the user's cart for the items that were ordered
  items.forEach(item => {
    const cartItemRef = doc(db, `carts/${userId}/items`, item.id);
    batch.delete(cartItemRef);
  });

  // 5. Commit all batched writes
  await batch.commit();

  console.log('✅ Order created successfully:', {
    orderId: newOrderRef.id,
    userId,
    userEmail,
    customerName: addressDetails?.name,
    total,
    addressId,
    paymentMethod,
    orderType,
    itemCount: items.length,
    status: 'Preparing'
  });

  return newOrderRef.id;
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<void> => {
  try {
    // First, get the order to check if we need to restore stock
    const orderDoc = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
    
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }

    const orderData = orderDoc.data();
    const currentStatus = orderData.status;
    const orderItems = orderData.items || [];

    // Use batch write to ensure atomicity
    const batch = writeBatch(db);
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    // If cancelling an order, restore stock for all items
    if (status === 'Cancelled' && currentStatus !== 'Cancelled') {
      console.log(`🔄 Restoring stock for cancelled order ${orderId}...`);
      
      for (const item of orderItems) {
        if (!item.productId || !item.quantity) {
          console.warn(`⚠️ Skipping item without productId or quantity:`, item);
          continue;
        }

        try {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await getDoc(productRef);

          if (!productDoc.exists()) {
            console.warn(`⚠️ Product ${item.productId} not found, skipping stock restoration`);
            continue;
          }

          const currentStock = productDoc.data().stock || 0;
          const restoredStock = currentStock + item.quantity;

          batch.update(productRef, { 
            stock: restoredStock 
          });

          console.log(`✅ Restored ${item.quantity} units of ${item.name || item.productId} (new stock: ${restoredStock})`);
        } catch (itemError) {
          console.error(`❌ Error restoring stock for item ${item.productId}:`, itemError);
          // Continue with other items even if one fails
        }
      }
    }

    // Update order status
    batch.update(orderRef, {
      status: status,
      updated_at: serverTimestamp(),
    });

    // Commit all changes atomically
    await batch.commit();
    
    console.log(`✅ Order ${orderId} status updated to ${status}${status === 'Cancelled' ? ' (stock restored)' : ''}`);
  } catch (error) {
    console.error('❌ Failed to update order status:', error);
    throw new Error('Failed to update order status');
  }
};
