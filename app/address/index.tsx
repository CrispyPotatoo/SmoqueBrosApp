import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../../components/AppDialogProvider';
import { useSession } from '../../context/SessionProvider';
import { Address, deleteAddress, getUserAddresses, setDefaultAddress } from '../../services/address';

export default function AddressListScreen() {
  const { session } = useSession();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const { showDialog } = useAppDialog();

  useEffect(() => {
    if (session) {
      loadAddresses();
    }
  }, [session]);

  // Reload addresses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (session) {
        loadAddresses();
      }
    }, [session])
  );

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const userAddresses = await getUserAddresses(session!.uid);
      setAddresses(userAddresses);
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to load addresses' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    showDialog({
      title: 'Delete Address',
      message: 'Are you sure you want to delete this address?',
      cancelText: 'Cancel',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteAddress(addressId);
          loadAddresses();
        } catch (error) {
          showDialog({ title: 'Error', message: 'Failed to delete address' });
        }
      },
    });
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(session!.uid, addressId);
      loadAddresses();
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to set default address' });
    }
  };

  const renderAddress = (address: Address) => (
    <View key={address.id} style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <Text style={styles.addressName}>{address.name}</Text>
        {address.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.addressText}>{address.phone_number}</Text>
      <Text style={styles.addressText}>
        {address.house_street}, {address.barangay}
      </Text>
      <Text style={styles.addressText}>
        {address.city}, {address.province} {address.postal_code}
      </Text>

      <View style={styles.addressActions}>
        {!address.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(address.id)}
          >
            <Text style={styles.actionButtonText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/address/edit/${address.id}`)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAddress(address.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity onPress={() => router.push('/address/add')}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No addresses found</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/address/add')}
            >
              <Text style={styles.addButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map(renderAddress)
        )}
      </ScrollView>

      {addresses.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push('/address/add')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addressActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
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
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
