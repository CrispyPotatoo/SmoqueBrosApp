import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import ImageCarousel from '../../components/ImageCarousel';
import { useProducts } from '../../context/ProductProvider';
import { useSession } from '../../context/SessionProvider';
import { getUserAddresses } from '../../services/address';
import { addToCart } from '../../services/cart';
import { getKYCStatus } from '../../services/kyc';
import { Product } from '../../services/products';

export default function ProductDetailScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getProductById } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { showDialog } = useAppDialog();

  const handleAddToCart = async () => {
    if (!session) {
      showDialog({
        title: 'Sign In Required',
        message: 'Please sign in to add items to your cart.',
        cancelText: 'Cancel',
        confirmText: 'Sign In',
        onConfirm: () => router.push('/(auth)/'),
      });
      return;
    }

    if (!product) return;

    if (product.flavors && product.flavors.length > 0 && !selectedFlavor) {
      showDialog({
        title: 'Select a Flavor',
        message: 'Please choose a flavor before adding to the cart.',
      });
      return;
    }

    setIsAddingToCart(true);
    try {
      // Check KYC verification status
      console.log('🔍 Checking KYC status before adding to cart...');
      const kycStatus = await getKYCStatus(session.uid);
      console.log('📋 KYC Status Result:', JSON.stringify(kycStatus, null, 2));
      console.log('✅ Status field:', kycStatus.status);
      console.log('✅ Is verified?:', kycStatus.status === 'verified');
      
      if (kycStatus.status !== 'verified') {
        console.log('❌ KYC check failed - status is not verified');
        console.log('❌ Current status:', kycStatus.status);
        setIsAddingToCart(false);
        showDialog({
          title: 'Verification Required',
          message: 'Please complete KYC verification before adding items to cart.',
          confirmText: 'Verify Now',
          cancelText: 'Cancel',
          onConfirm: () => router.push('/kyc'),
        });
        return;
      }

      // Check if user has at least one address
      const userAddresses = await getUserAddresses(session.uid);
      
      if (userAddresses.length === 0) {
        setIsAddingToCart(false);
        showDialog({
          title: 'Address Required',
          message: 'Please add a delivery address before adding items to cart.',
          confirmText: 'Add Address',
          cancelText: 'Cancel',
          onConfirm: () => router.push('/address/add'),
        });
        return;
      }

      // All checks passed, add to cart
      await addToCart(session.uid, product, selectedFlavor, 1);
      router.push('/cart');
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Could not add item to cart. Please try again.';
      showDialog({ title: 'Error', message: errorMessage });
    } finally {
      setIsAddingToCart(false);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (typeof id !== 'string') {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const data = await getProductById(id);
        setProduct(data);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Product not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get images array for carousel, fallback to single imageUrl
  const productImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.imageUrl];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageCarousel images={productImages} height={400} />
        <View style={styles.detailsContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.stockStatus}>{product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}</Text>
          <Text style={styles.productPrice}>₱{(product.price || 0).toFixed(2)}</Text>
          
          {/* Rating and Reviews */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(product.rating || 0) ? 'star' : 'star-outline'}
                  size={18}
                  color="#FFD700"
                  style={styles.starIcon}
                />
              ))}
              <Text style={styles.ratingText}>
                {(product.rating || 0).toFixed(1)} ({product.reviews || 0} {product.reviews === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.seeReviewsButton}
              onPress={() => router.push(`/reviews/${product.id}`)}
            >
              <Text style={styles.seeReviewsText}>See Reviews</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.productDescription}>{product.description}</Text>

          {product.flavors && product.flavors.length > 0 && (
            <View style={styles.flavorContainer}>
              <Text style={styles.flavorTitle}>Flavor</Text>
              <View style={styles.flavorGrid}>
                {product.flavors.map((flavor) => (
                  <TouchableOpacity
                    key={flavor}
                    style={[
                      styles.flavorButton,
                      selectedFlavor === flavor && styles.selectedFlavorButton,
                    ]}
                    onPress={() => setSelectedFlavor(flavor)}
                  >
                    <Text
                      style={[
                        styles.flavorButtonText,
                        selectedFlavor === flavor && styles.selectedFlavorButtonText,
                      ]}
                    >
                      {flavor}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            (!product || product.stock === 0) && styles.disabledButton,
          ]}
          onPress={handleAddToCart}
          disabled={isAddingToCart || !product || product.stock === 0}
        >
          {isAddingToCart ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addToCartButtonText}>
              {product?.stock === 0 ? 'Out of Stock' : 'Add to cart'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 6,
    marginLeft: 10,
  },
  detailsContainer: {
    padding: 24,
  },
  productName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stockStatus: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  productDescription: {
    fontSize: 16,
    color: '#687076',
    lineHeight: 25,
  },
  flavorContainer: {
    marginTop: 24,
  },
  flavorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  flavorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  flavorButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedFlavorButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  flavorButtonText: {
    fontSize: 16,
    color: '#000',
  },
  selectedFlavorButtonText: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  addToCartButton: {
    backgroundColor: '#000', // Primary black color
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#c0c0c0',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingContainer: {
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  seeReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeReviewsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 4,
  },
});
