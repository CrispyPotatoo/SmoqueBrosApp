import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, FlatList, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useProducts } from '../context/ProductProvider';
import { Product } from '../services/products';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { products } = useProducts();
  const [results, setResults] = useState<Product[]>([]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim()) {
      const filteredData = products.filter((item) =>
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setResults(filteredData);
    } else {
      setResults([]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#9e9e9e" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search for products..."
          placeholderTextColor="#9e9e9e"
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => router.push(`/product/${item.id}`)}>
            <Text style={styles.resultText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
  },
  resultItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultText: {
    fontSize: 18,
    color: '#222',
  },
});
