import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../../../components/AppDialogProvider';
import { useSession } from '../../../context/SessionProvider';
import { getUserAddresses, updateAddress } from '../../../services/address';

export default function EditAddressScreen() {
  const { session } = useSession();
  const { id } = useLocalSearchParams();
  const { showDialog } = useAppDialog();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    house_street: '',
    barangay: '',
    city: '',
    province: '',
    postal_code: '',
    isDefault: false,
  });

  useEffect(() => {
    if (session && id) {
      loadAddress();
    }
  }, [session, id]);

  const loadAddress = async () => {
    try {
      setInitialLoading(true);
      const addresses = await getUserAddresses(session!.uid);
      const address = addresses.find(addr => addr.id === id);
      
      if (address) {
        setFormData({
          name: address.name,
          phone_number: address.phone_number,
          house_street: address.house_street,
          barangay: address.barangay,
          city: address.city,
          province: address.province,
          postal_code: address.postal_code,
          isDefault: address.isDefault || false,
        });
      } else {
        showDialog({
          title: 'Error',
          message: 'Address not found',
          confirmText: 'OK',
          onConfirm: () => router.back(),
        });
      }
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to load address' });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['name', 'phone_number', 'house_street', 'barangay', 'city', 'province', 'postal_code'];
    for (const field of required) {
      if (!formData[field as keyof typeof formData].toString().trim()) {
        showDialog({
          title: 'Error',
          message: `Please fill in ${field.replace('_', ' ')}`,
        });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      await updateAddress(id as string, formData);
      showDialog({
        title: 'Success',
        message: 'Address updated successfully',
        confirmText: 'OK',
        onConfirm: () => router.back(),
      });
    } catch (error) {
      showDialog({ title: 'Error', message: 'Failed to update address' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
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
        <Text style={styles.headerTitle}>Edit Address</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone_number}
              onChangeText={(value) => handleInputChange('phone_number', value)}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>House/Street Address *</Text>
            <TextInput
              style={styles.input}
              value={formData.house_street}
              onChangeText={(value) => handleInputChange('house_street', value)}
              placeholder="Enter house number and street"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barangay *</Text>
            <TextInput
              style={styles.input}
              value={formData.barangay}
              onChangeText={(value) => handleInputChange('barangay', value)}
              placeholder="Enter barangay"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(value) => handleInputChange('city', value)}
                placeholder="Enter city"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Province *</Text>
              <TextInput
                style={styles.input}
                value={formData.province}
                onChangeText={(value) => handleInputChange('province', value)}
                placeholder="Enter province"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Postal Code *</Text>
            <TextInput
              style={styles.input}
              value={formData.postal_code}
              onChangeText={(value) => handleInputChange('postal_code', value)}
              placeholder="Enter postal code"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.defaultToggle}
            onPress={() => setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
          >
            <View style={styles.checkbox}>
              {formData.isDefault && (
                <Ionicons name="checkmark" size={16} color="#000" />
              )}
            </View>
            <Text style={styles.defaultText}>Set as default address</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Update Address</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
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
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultText: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
