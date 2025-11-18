import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../../components/AppDialogProvider';
import { useSession } from '../../context/SessionProvider';
import { Address, getUserAddresses, setDefaultAddress } from '../../services/address';

export default function SelectAddressScreen() {
  const { session } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const { showDialog } = useAppDialog();

  useEffect(() => {
    if (session) {
      loadAddresses();
    }
  }, [session]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const userAddresses = await getUserAddresses(session!.uid);
      setAddresses(userAddresses);
      
      // Find current default address
      const defaultAddr = userAddresses.find(addr => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      }
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to load addresses' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = async (addressId: string) => {
    try {
      setSelectedAddress(addressId);
      await setDefaultAddress(session!.uid, addressId);
      
      // Navigate back to checkout
      router.back();
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to select address' });
    }
  };

  const handleAddNewAddress = () => {
    router.push('/address/add');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Address</Text>
        <TouchableOpacity onPress={handleAddNewAddress}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No addresses found</Text>
            <Text style={styles.emptySubtitle}>Add your first delivery address</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddNewAddress}>
              <Text style={styles.addButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((address) => (
            <TouchableOpacity
              key={address.id}
              style={[
                styles.addressCard,
                selectedAddress === address.id && styles.selectedCard
              ]}
              onPress={() => handleSelectAddress(address.id)}
            >
              <View style={styles.addressHeader}>
                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>{address.name}</Text>
                  <Text style={styles.addressPhone}>{address.phone_number}</Text>
                </View>
                <View style={styles.radioContainer}>
                  <View style={[
                    styles.radioButton,
                    selectedAddress === address.id && styles.radioSelected
                  ]}>
                    {selectedAddress === address.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
              </View>
              
              <Text style={styles.addressText}>
                {address.house_street}, {address.barangay}
              </Text>
              <Text style={styles.addressText}>
                {address.city}, {address.province} {address.postal_code}
              </Text>
              
              {address.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#eee',
  },
  selectedCard: {
    borderColor: '#000',
    backgroundColor: '#f8f8f8',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
  },
  radioContainer: {
    marginLeft: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#000',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  defaultBadge: {
    backgroundColor: '#000',
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
});
