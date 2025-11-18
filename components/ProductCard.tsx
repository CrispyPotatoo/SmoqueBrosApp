import { Product } from '@/services/products';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const hasValidImage = product.imageUrl && product.imageUrl.trim() !== '';

  return (
    <View style={styles.card}>
      {hasValidImage ? (
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.stock}>{product.stock > 0 ? `${product.stock} stocks left` : 'Out of Stock'}</Text>
        <Text style={styles.price}>₱{(product.price || 0).toFixed(2)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'space-between',
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoContainer: {
    paddingTop: 16,
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    height: 34, // Set a fixed height for 2 lines of text
  },
  stock: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default ProductCard;
