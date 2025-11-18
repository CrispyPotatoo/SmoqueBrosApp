import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  getDocs,
  QueryDocumentSnapshot,
  deleteDoc,
  updateDoc,
  query,
  where,
  addDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../constants/firebaseConfig';
import { Product } from './products';

const CARTS_COLLECTION = 'carts';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl: string;
  stock: number;
  sizes: string[];
  colors: string[];
  flavors: string[];
  rating: number;
  reviews: number;
  quantity: number;
  flavor?: string;
  
  // Additional fields for web platform compatibility
  user_id?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  created_at?: any;
  createdAt?: any;
  updated_at?: any;
  updatedAt?: any;
  addedFromApp?: boolean;
  platform?: string;
  total_price?: number;
  totalPrice?: number;
  item_status?: string;
  itemStatus?: string;
  lastModifiedFromApp?: boolean;
}

export const removeFromCart = async (userId: string, cartItemId: string): Promise<void> => {
  if (!userId) {
    throw new Error('User is not logged in.');
  }

  console.log('🗑️ Removing item from cart:', {
    userId,
    cartItemId
  });

  // Use subcollection structure: carts/{userId}/items/{itemId}
  const userCartRef = doc(db, CARTS_COLLECTION, userId);
  const itemRef = doc(userCartRef, 'items', cartItemId);

  try {
    await deleteDoc(itemRef);
    console.log('✅ Cart item removed successfully:', { cartItemId, userId });
  } catch (error) {
    console.error('❌ Error removing item from cart:', error);
    throw new Error('Could not remove item from cart.');
  }
};

export const updateCartItemQuantity = async (
  userId: string,
  itemId: string,
  newQuantity: number
): Promise<void> => {
  if (!userId) {
    throw new Error('User is not logged in.');
  }
  
  console.log('📝 Updating cart item quantity:', {
    userId,
    itemId,
    newQuantity
  });
  
  // Use subcollection structure: carts/{userId}/items/{itemId}
  const userCartRef = doc(db, CARTS_COLLECTION, userId);
  const cartItemRef = doc(userCartRef, 'items', itemId);

  try {
    if (newQuantity > 0) {
      const itemDoc = await getDoc(cartItemRef);
      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        const currentQuantityInCart = Number(itemData.quantity) || 0;
        const productId = itemData.product_id || itemId.split('-')[0];
        
        // Fetch product to check stock
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
          const productData = productDoc.data();
          const availableStock = productData.stock || 0;
          
          // Validate stock availability
          if (newQuantity > currentQuantityInCart && newQuantity > availableStock) {
            throw new Error(`Insufficient stock. Only ${availableStock} item(s) available.`);
          }
        }
        
        const newTotalPrice = itemData.price * newQuantity;
        
        const updateData = {
          quantity: newQuantity,
          total_price: newTotalPrice,
          updated_at: serverTimestamp(),
        };
        
        await updateDoc(cartItemRef, updateData);
        
        console.log('✅ Cart item quantity updated:', {
          itemId,
          newQuantity,
          newTotalPrice
        });
      }
    } else {
      await deleteDoc(cartItemRef);
      console.log('✅ Cart item removed (quantity <= 0):', { itemId });
    }
  } catch (error) {
    console.error('❌ Error updating cart item quantity:', error);
    if (error instanceof Error) {
      throw error; // Re-throw the error with the original message
    }
    throw new Error('Could not update cart item quantity.');
  }
};

export const clearCart = async (userId: string): Promise<void> => {
  console.log('🧹 Clearing cart for user:', userId);
  
  try {
    // Use subcollection structure: carts/{userId}/items
    const userCartRef = doc(db, CARTS_COLLECTION, userId);
    const cartItemsRef = collection(userCartRef, 'items');
    const cartSnapshot = await getDocs(cartItemsRef);
    const deletePromises = cartSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('✅ Cart cleared successfully:', { userId, itemsRemoved: cartSnapshot.size });
  } catch (error) {
    console.error('❌ Error clearing cart:', error);
    throw new Error('Could not clear cart.');
  }
};

export const getCartItems = async (userId: string): Promise<CartItem[]> => {
  if (!userId) {
    throw new Error('User is not logged in.');
  }

  console.log('🛒 Fetching cart items for user:', userId);

  // Use subcollection structure: carts/{userId}/items
  const userCartRef = doc(db, CARTS_COLLECTION, userId);
  const cartItemsRef = collection(userCartRef, 'items');
  const querySnapshot = await getDocs(cartItemsRef);

  console.log('📦 Found', querySnapshot.size, 'cart items in Firestore');

  const cartItems: CartItem[] = [];
  querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
    const data = doc.data();
    console.log('📄 Cart item data:', { id: doc.id, data });
    
    cartItems.push({
      id: doc.id,
      productId: data.product_id || '',
      name: data.name || '',
      price: Number(data.price) || 0,
      description: '',
      category: '',
      imageUrl: data.image || '',
      stock: Number(data.stock) || 0,
      sizes: [],
      colors: [],
      flavors: [],
      rating: 0,
      reviews: 0,
      quantity: Number(data.quantity) || 0,
      flavor: data.flavor || '',
    } as CartItem);
  });

  console.log('✅ Processed cart items:', cartItems.length, cartItems);
  return cartItems;
};

export const addToCart = async (userId: string, product: Product, flavor: string | null, quantity: number): Promise<void> => {
  if (!userId) {
    throw new Error('User is not logged in.');
  }

  console.log('🛒 Adding item to cart:', {
    userId,
    productId: product.id,
    productName: product.name,
    flavor,
    quantity
  });

  try {
    // Check stock availability first
    if (quantity > product.stock) {
      throw new Error(`Out of stock! Only ${product.stock} item(s) available.`);
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userEmail = currentUser?.email || 'unknown@example.com';
    const timestamp = serverTimestamp();
    const totalPrice = product.price * quantity;
    
    // Use subcollection structure: carts/{userId}/items/{itemId}
    const userCartRef = doc(db, CARTS_COLLECTION, userId);
    const cartItemsRef = collection(userCartRef, 'items');
    
    // Create unique item ID based on product and flavor
    const itemFlavor = flavor ? flavor.replace(/\s+/g, '-') : 'default';
    const itemId = `${product.id}-${itemFlavor}`;
    const itemRef = doc(cartItemsRef, itemId);
    
    console.log('🏷️ Generated item ID:', itemId, 'for product:', product.name, 'flavor:', flavor);
    
    // Check if item already exists
    const existingItem = await getDoc(itemRef);
    
    if (existingItem.exists()) {
      // Update existing item quantity
      const currentData = existingItem.data();
      const newQuantity = currentData.quantity + quantity;
      
      // Check if new quantity exceeds stock
      if (newQuantity > product.stock) {
        const availableToAdd = product.stock - currentData.quantity;
        throw new Error(`Cannot add ${quantity} more item(s). Only ${availableToAdd} item(s) can be added.`);
      }
      
      const newTotalPrice = product.price * newQuantity;
      
      const updateData = {
        quantity: newQuantity,
        total_price: newTotalPrice,
        updated_at: timestamp,
      };
      
      await updateDoc(itemRef, updateData);
      
      console.log('✅ Cart item quantity updated:', {
        itemId,
        oldQuantity: currentData.quantity,
        newQuantity,
        newTotalPrice
      });
    } else {
      // Create new cart item
      const cartItem = {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: product.imageUrl || '',
        quantity,
        flavor: flavor || '',
        stock: product.stock || 0,
        total_price: totalPrice,
        user_id: userId,
        created_at: timestamp,
        updated_at: timestamp,
      };
      
      await setDoc(itemRef, cartItem);
      
      console.log('✅ New cart item added:', {
        itemId,
        productName: product.name,
        quantity,
        totalPrice,
        flavor
      });
    }
    
    console.log('🎯 Cart item successfully added/updated for web platform compatibility');
  } catch (error) {
    console.error('❌ Error adding item to cart:', error);
    if (error instanceof Error) {
      throw error; // Re-throw the error with the original message
    }
    throw new Error('Could not add item to cart.');
  }
};
