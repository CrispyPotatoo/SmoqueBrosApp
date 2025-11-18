import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DropdownItem {
  code: string;
  name: string;
  [key: string]: any;
}

interface AddressDropdownProps {
  label: string;
  placeholder: string;
  value: string;
  items: DropdownItem[];
  onSelect: (item: any) => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function AddressDropdown({
  label,
  placeholder,
  value,
  items,
  onSelect,
  disabled = false,
  loading = false,
}: AddressDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item: DropdownItem) => {
    onSelect(item);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label} *</Text>
      <TouchableOpacity
        style={[
          styles.dropdown,
          disabled && styles.dropdownDisabled,
        ]}
        onPress={() => !disabled && !loading && setModalVisible(true)}
        disabled={disabled || loading}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholder]}>
          {loading ? 'Loading...' : value || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? '#ccc' : '#666'}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.itemText}>{item.name}</Text>
                  {value === item.name && (
                    <Ionicons name="checkmark" size={20} color="#000" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No results found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  placeholder: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemText: {
    fontSize: 16,
    color: '#000',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#999',
  },
});
