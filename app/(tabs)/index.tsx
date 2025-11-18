import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Image,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Product } from '@/services/products';
import { useProducts } from '@/context/ProductProvider';
import ProductCard from '@/components/ProductCard';

export default function HomeScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const { products, isLoading, error, getProductsByCategory, refreshProducts } = useProducts();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string>('All');
  const [currentSort, setCurrentSort] = useState<string>('default');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Filter out archived products (safety measure)
    // Note: This shouldn't be necessary since subscribeToProducts already filters,
    // but adding it as an extra safety layer
    const nonArchivedProducts = products.filter(product => {
      // Products from Firestore should already be filtered, but check just in case
      // The Product interface doesn't include archived field, so we can't check it here
      // The filtering happens in the service layer
      return true;
    });
    setFilteredProducts(nonArchivedProducts);
  }, [products]);

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (error) {
    return <Text style={[styles.centered, { color: 'red' }]}>{error}</Text>;
  }

  const applySorting = (productList: Product[], sortType: string) => {
    let sorted = [...productList];
    
    switch (sortType) {
      case 'price-low-high':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        sorted.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    
    setFilteredProducts(sorted);
  };

  const filterProducts = async (category: string) => {
    setCurrentCategory(category);
    let filtered: Product[];
    
    if (category === 'All') {
      filtered = products;
    } else {
      filtered = await getProductsByCategory(category);
    }
    
    applySorting(filtered, currentSort);
    setModalVisible(false);
  };

  const sortProducts = (sortType: string) => {
    setCurrentSort(sortType);
    applySorting(filteredProducts, sortType);
    setModalVisible(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProducts();
      // If a category filter is active, re-fetch products for that category
      if (currentCategory !== 'All') {
        const filtered = await getProductsByCategory(currentCategory);
        applySorting(filtered, currentSort);
      }
      // For 'All' category, the useEffect will automatically update filteredProducts
      // when products state changes
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity onPress={() => router.push(`/product/${item.id}`)}>
      <ProductCard product={item} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.shopHeader}>
        <Text style={styles.shopTitle}>Shop</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Feather name="sliders" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <TouchableOpacity style={styles.centeredView} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Filter by Category</Text>
            <TouchableOpacity 
              style={[styles.modalButton, currentCategory === 'All' && styles.modalButtonActive]} 
              onPress={() => filterProducts('All')}
            >
              <Text style={styles.modalButtonText}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, currentCategory === 'Vape Mod Kits' && styles.modalButtonActive]} 
              onPress={() => filterProducts('Vape Mod Kits')}
            >
              <Text style={styles.modalButtonText}>Mods</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, currentCategory === 'Vape Pods' && styles.modalButtonActive]} 
              onPress={() => filterProducts('Vape Pods')}
            >
              <Text style={styles.modalButtonText}>Pods</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, currentCategory === 'Disposable Vapes' && styles.modalButtonActive]} 
              onPress={() => filterProducts('Disposable Vapes')}
            >
              <Text style={styles.modalButtonText}>Disposable</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.modalText}>Sort by Price</Text>
            <TouchableOpacity 
              style={[styles.modalButton, currentSort === 'default' && styles.modalButtonActive]} 
              onPress={() => sortProducts('default')}
            >
              <Text style={styles.modalButtonText}>Default Order</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, currentSort === 'price-low-high' && styles.modalButtonActive]} 
              onPress={() => sortProducts('price-low-high')}
            >
              <Text style={styles.modalButtonText}>Price: Low to High</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, currentSort === 'price-high-low' && styles.modalButtonActive]} 
              onPress={() => sortProducts('price-high-low')}
            >
              <Text style={styles.modalButtonText}>Price: High to Low</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cardContainer}
            onPress={() => router.push(`/product/${item.id}`)}
          >
            <ProductCard product={item} />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        key={'two-columns'}
        contentContainerStyle={styles.productList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000']} // Android
            tintColor="#000" // iOS
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  productList: {
    paddingVertical: 10,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff', 
  },
  shopTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  cardContainer: {
    width: '50%',
    padding: 6,
  },
  productCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#f9f9f9', 
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 180,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  // Modal Styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalView: {
    margin: 20,
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
  },
  modalButtonActive: {
    backgroundColor: '#000',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
});
