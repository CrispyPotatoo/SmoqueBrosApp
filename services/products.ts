import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl: string;
  images?: string[]; // Array of image URLs for carousel
  stock: number;
  sizes: string[];
  colors: string[];
  flavors?: string[];
  rating?: number;
  reviews?: number;
}

const PRODUCTS_COLLECTION = 'products';

const transformProductData = (id: string, data: any): Product => {
  // Handle images array - prioritize images array, then single image fields
  let images: string[] = [];
  let imageUrl = '';
  
  if (Array.isArray(data.images) && data.images.length > 0) {
    // Filter out empty strings and get valid image URLs
    images = data.images.filter((img: string) => img && img.trim() !== '');
    imageUrl = images[0] || '';
  } else {
    // Fallback to single image fields
    if (data.imageUrl && data.imageUrl.trim() !== '') {
      imageUrl = data.imageUrl;
      images = [data.imageUrl];
    } else if (data.image && data.image.trim() !== '') {
      imageUrl = data.image;
      images = [data.image];
    } else {
      imageUrl = 'https://via.placeholder.com/300x200/f0f0f0/666666?text=No+Image';
      images = [imageUrl];
    }
  }
  
  return {
    id,
    name: data.name || '',
    price: typeof data.price === 'number' ? data.price : parseFloat(data.price) || 0,
    description: data.description || '',
    category: data.category || '',
    imageUrl,
    images: images.length > 0 ? images : undefined,
    stock: typeof data.stock === 'number' ? data.stock : parseInt(data.stock) || 0,
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
    colors: Array.isArray(data.colors) ? data.colors : [],
    flavors: Array.isArray(data.flavors) ? data.flavors : undefined,
    rating: typeof data.rating === 'number' ? data.rating : parseFloat(data.rating) || undefined,
    reviews: typeof data.reviews === 'number' ? data.reviews : parseInt(data.reviews) || undefined,
  };
};

export type ProductsCallback = (products: Product[]) => void;
export type ProductCallback = (product: Product | null) => void;

export const getProducts = async (): Promise<Product[]> => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = query(productsRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const productData = doc.data();
      // Skip archived products (check for true, "true", 1, or any truthy value)
      const isArchived = productData.archived === true || 
                        productData.archived === 'true' || 
                        productData.archived === 1 ||
                        (productData.archived !== undefined && productData.archived !== false && productData.archived !== 'false' && productData.archived !== 0);
      
      if (isArchived) {
        console.log(`Skipping archived product: ${productData.name || doc.id}`);
        return;
      }
      products.push(transformProductData(doc.id, productData));
    });
    
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const productDocRef = doc(db, PRODUCTS_COLLECTION, id);
    const productDoc = await getDoc(productDocRef);

    if (productDoc.exists()) {
      return transformProductData(productDoc.id, productDoc.data());
    } else {
      console.log('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
};

export const getProductsByCategory = async (category: string): Promise<Product[]> => {
  try {
    console.log(`🔍 Fetching products for category: "${category}"`);
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    // Remove orderBy to avoid composite index requirement - sort in memory instead
    const q = query(productsRef, where('category', '==', category));
    const querySnapshot = await getDocs(q);
    
    console.log(`📦 Found ${querySnapshot.size} products for category "${category}"`);
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const productData = doc.data();
      // Skip archived products (check for true, "true", 1, or any truthy value)
      const isArchived = productData.archived === true || 
                        productData.archived === 'true' || 
                        productData.archived === 1 ||
                        (productData.archived !== undefined && productData.archived !== false && productData.archived !== 'false' && productData.archived !== 0);
      
      if (isArchived) {
        console.log(`Skipping archived product: ${productData.name || doc.id}`);
        return;
      }
      console.log(`  - Product: ${productData.name}, Category: "${productData.category}"`);
      products.push(transformProductData(doc.id, productData));
    });
    
    // Sort by name in memory
    products.sort((a, b) => a.name.localeCompare(b.name));
    
    return products;
  } catch (error) {
    console.error(`Error fetching products by category ${category}:`, error);
    throw error;
  }
};

export const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const docRef = await addDoc(productsRef, product);
    
    return {
      id: docRef.id,
      ...product
    };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Omit<Product, 'id'>>): Promise<void> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(productRef, updates);
  } catch (error) {
    console.error(`Error updating product with id ${id}:`, error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(productRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const subscribeToProducts = (callback: (products: Product[]) => void): Unsubscribe => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    // Filter out archived products at the query level if possible
    // Note: Firestore doesn't support != queries easily, so we filter in memory
    const q = query(productsRef, orderBy('name'));
    
    return onSnapshot(q, (querySnapshot) => {
      const products: Product[] = [];
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        // Skip archived products (check for true, "true", 1, or any truthy value)
        const isArchived = productData.archived === true || 
                          productData.archived === 'true' || 
                          productData.archived === 1 ||
                          (productData.archived !== undefined && productData.archived !== false && productData.archived !== 'false' && productData.archived !== 0);
        
        if (isArchived) {
          console.log(`Skipping archived product: ${productData.name || doc.id}`);
          return;
        }
        products.push(transformProductData(doc.id, productData));
      });
      
      console.log(`Loaded ${products.length} non-archived products`);
      callback(products);
    }, (error) => {
      console.error('Products listener error:', error);
    });
  } catch (error) {
    console.error('Error setting up products listener:', error);
    throw error;
  }
};

export const subscribeToProduct = (productId: string, callback: (product: Product | null) => void): Unsubscribe => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    
    return onSnapshot(productRef, (doc) => {
      if (doc.exists()) {
        const product = transformProductData(doc.id, doc.data());
        callback(product);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Product listener error:', error);
    });
  } catch (error) {
    console.error('Error setting up product listener:', error);
    throw error;
  }
};
