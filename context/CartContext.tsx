import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { db } from '../constants/firebaseConfig';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { useSession } from '../context/SessionProvider';

interface CartContextType {
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { session } = useSession();
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    if (session?.uid) {
      console.log('🔔 Setting up cart badge listener for user:', session.uid);
      
      // Use subcollection structure: carts/{userId}/items
      const userCartRef = doc(db, 'carts', session.uid);
      const cartItemsRef = collection(userCartRef, 'items');

      const unsubscribe = onSnapshot(cartItemsRef, (snapshot) => {
        // Calculate total quantity (sum of all item quantities) instead of just counting documents
        let totalQuantity = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          totalQuantity += Number(data.quantity) || 0;
        });
        console.log('🔔 Cart badge updated:', totalQuantity, 'total items (', snapshot.size, 'unique products)');
        setItemCount(totalQuantity);
      }, (error) => {
        console.error('❌ Cart badge listener error:', error);
        setItemCount(0);
      });

      return () => {
        console.log('🔔 Cleaning up cart badge listener');
        unsubscribe();
      };
    } else {
      console.log('🔔 No session, setting cart badge to 0');
      setItemCount(0);
    }
  }, [session]);

  return (
    <CartContext.Provider value={{ itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
