import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';

export interface Address {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  house_street: string;
  barangay: string;
  city: string;
  province: string;
  postal_code: string;
  isDefault?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const ADDRESSES_COLLECTION = 'address';

export const getUserAddresses = async (userId: string): Promise<Address[]> => {
  try {
    console.log('📄 Fetching addresses for user:', userId);
    const addressesQuery = query(
      collection(db, ADDRESSES_COLLECTION),
      where('user_id', '==', userId)
    );
    
    const snapshot = await getDocs(addressesQuery);
    const addresses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Address));
    
    console.log('✅ Found addresses:', addresses.length, addresses);
    
    // Sort by createdAt in memory instead of using Firestore orderBy
    return addresses.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // desc order
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    throw new Error('Could not fetch addresses');
  }
};

export const getDefaultAddress = async (userId: string): Promise<Address | null> => {
  try {
    const addresses = await getUserAddresses(userId);
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  } catch (error) {
    console.error('Error fetching default address:', error);
    return null;
  }
};

export const addAddress = async (userId: string, addressData: Omit<Address, 'id' | 'user_id' | 'createdAt' | 'updatedAt'>): Promise<Address> => {
  try {
    console.log('🏠 Adding address for user:', userId, addressData);
    const newAddress = {
      ...addressData,
      user_id: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, ADDRESSES_COLLECTION), newAddress);
    console.log('✅ Address added successfully with ID:', docRef.id);
    
    return {
      id: docRef.id,
      user_id: userId,
      ...addressData,
    };
  } catch (error) {
    console.error('Error adding address:', error);
    throw new Error('Could not add address');
  }
};

export const updateAddress = async (addressId: string, updates: Partial<Omit<Address, 'id' | 'user_id'>>): Promise<void> => {
  try {
    const addressRef = doc(db, ADDRESSES_COLLECTION, addressId);
    await updateDoc(addressRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating address:', error);
    throw new Error('Could not update address');
  }
};

export const deleteAddress = async (addressId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ADDRESSES_COLLECTION, addressId));
  } catch (error) {
    console.error('Error deleting address:', error);
    throw new Error('Could not delete address');
  }
};

export const getAddressById = async (addressId: string): Promise<Address | null> => {
  try {
    const addressRef = doc(db, ADDRESSES_COLLECTION, addressId);
    const addressDoc = await getDoc(addressRef);
    
    if (!addressDoc.exists()) {
      return null;
    }
    
    return {
      id: addressDoc.id,
      ...addressDoc.data()
    } as Address;
  } catch (error) {
    console.error('Error fetching address by ID:', error);
    return null;
  }
};

export const setDefaultAddress = async (userId: string, addressId: string): Promise<void> => {
  try {
    // First, remove default from all user addresses
    const addresses = await getUserAddresses(userId);
    const updatePromises = addresses.map(addr => 
      updateDoc(doc(db, ADDRESSES_COLLECTION, addr.id), { isDefault: false })
    );
    await Promise.all(updatePromises);

    // Then set the selected address as default
    await updateDoc(doc(db, ADDRESSES_COLLECTION, addressId), { 
      isDefault: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    throw new Error('Could not set default address');
  }
};
