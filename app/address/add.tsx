import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import AddressDropdown from '../../components/AddressDropdown';
import { useAppDialog } from '../../components/AppDialogProvider';
import { useSession } from '../../context/SessionProvider';
import { addAddress } from '../../services/address';
import {
    Barangay,
    City,
    getBarangaysByCity,
    getCitiesByProvince,
    getProvinces,
    Province,
} from '../../services/psgc';

export default function AddAddressScreen() {
  const { session } = useSession();
  const { showDialog } = useAppDialog();
  const [loading, setLoading] = useState(false);
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

  // Set name from session when it loads
  useEffect(() => {
    if (session?.username && !formData.name) {
      setFormData(prev => ({ ...prev, name: session.username }));
    }
  }, [session]);

  // PSGC data states
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  
  // Selected codes for API calls
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedCityCode, setSelectedCityCode] = useState('');
  
  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, []);

  // Load cities when province changes
  useEffect(() => {
    if (selectedProvinceCode) {
      loadCities(selectedProvinceCode);
    } else {
      setCities([]);
      setBarangays([]);
    }
  }, [selectedProvinceCode]);

  // Load barangays when city changes
  useEffect(() => {
    if (selectedCityCode) {
      loadBarangays(selectedCityCode);
    } else {
      setBarangays([]);
    }
  }, [selectedCityCode]);

  const loadProvinces = async () => {
    setLoadingProvinces(true);
    try {
      const data = await getProvinces();
      setProvinces(data);
    } catch (error) {
      console.error('Error loading provinces:', error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadCities = async (provinceCode: string) => {
    setLoadingCities(true);
    try {
      const data = await getCitiesByProvince(provinceCode);
      setCities(data);
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const loadBarangays = async (cityCode: string) => {
    setLoadingBarangays(true);
    try {
      const data = await getBarangaysByCity(cityCode);
      setBarangays(data);
    } catch (error) {
      console.error('Error loading barangays:', error);
    } finally {
      setLoadingBarangays(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProvinceSelect = (province: Province) => {
    setSelectedProvinceCode(province.code);
    setFormData(prev => ({ ...prev, province: province.name, city: '', barangay: '' }));
    setSelectedCityCode('');
  };

  const handleCitySelect = (city: City) => {
    setSelectedCityCode(city.code);
    setFormData(prev => ({ ...prev, city: city.name, barangay: '' }));
  };

  const handleBarangaySelect = (barangay: Barangay) => {
    setFormData(prev => ({ ...prev, barangay: barangay.name }));
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
    if (!session?.uid) {
      showDialog({ title: 'Error', message: 'Please sign in to add an address' });
      return;
    }

    if (!session.username) {
      showDialog({
        title: 'Error',
        message: 'Your username is required. Please update your profile first.',
      });
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);
      await addAddress(session.uid, formData);
      showDialog({
        title: 'Success',
        message: 'Address added successfully',
        confirmText: 'OK',
        onConfirm: () => router.back(),
      });
    } catch (error: any) {
      console.error('Error adding address:', error);
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to add address',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Address</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone_number}
              onChangeText={(value) => handleInputChange('phone_number', value)}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <AddressDropdown
            label="Province"
            placeholder="Select province"
            value={formData.province}
            items={provinces}
            onSelect={handleProvinceSelect}
            loading={loadingProvinces}
          />

          <AddressDropdown
            label="City/Municipality"
            placeholder="Select city"
            value={formData.city}
            items={cities}
            onSelect={handleCitySelect}
            disabled={!selectedProvinceCode}
            loading={loadingCities}
          />

          <AddressDropdown
            label="Barangay"
            placeholder="Select barangay"
            value={formData.barangay}
            items={barangays}
            onSelect={handleBarangaySelect}
            disabled={!selectedCityCode}
            loading={loadingBarangays}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Postal Code *</Text>
            <TextInput
              style={styles.input}
              value={formData.postal_code}
              onChangeText={(value) => handleInputChange('postal_code', value)}
              placeholder="Enter postal code"
              placeholderTextColor="#999"
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
            <Text style={styles.saveButtonText}>Save Address</Text>
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
    color: '#000',
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
