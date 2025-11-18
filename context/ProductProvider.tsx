import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  getProductById as getProductByIdFromService,
  getProductsByCategory as getProductsByCategoryFromService,
  getProducts as getProductsFromService,
  addProduct as addProductToService,
  updateProduct as updateProductInService,
  deleteProduct as deleteProductFromService,
  subscribeToProducts,
  Product 
} from '../services/products';

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  getProductById: (id: string) => Promise<Product | null>;
  getProductsByCategory: (category: string) => Promise<Product[]>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | null>(null);

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const setupListener = () => {
    // Unsubscribe from previous listener if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to products updates
    const unsubscribe = subscribeToProducts((updatedProducts) => {
      // subscribeToProducts already filters archived products, so we can use the products directly
      setProducts(updatedProducts);
      setIsLoading(false);
      setError(null);
    });

    unsubscribeRef.current = unsubscribe;
    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = setupListener();
    return () => {
      unsubscribe();
    };
  }, []);

  const refreshProducts = async () => {
    try {
      setIsLoading(true);
      // Force refresh by fetching products directly
      const freshProducts = await getProductsFromService();
      setProducts(freshProducts);
      setIsLoading(false);
      setError(null);
      
      // Re-setup listener to ensure we have the latest data
      setupListener();
    } catch (err) {
      console.error('Error refreshing products:', err);
      setError('Failed to refresh products');
      setIsLoading(false);
    }
  };



  const addNewProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
    try {
      const newProduct = await addProductToService(product);
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    }
  };

  const updateExistingProduct = async (id: string, updates: Partial<Omit<Product, 'id'>>): Promise<void> => {
    try {
      await updateProductInService(id, updates);
      setProducts(prev => 
        prev.map(p => 
          p.id === id ? { ...p, ...updates } as Product : p
        )
      );
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  };

  const removeProduct = async (id: string): Promise<void> => {
    try {
      await deleteProductFromService(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting product:', err);
      throw err;
    }
  };

  const fetchProductById = async (id: string): Promise<Product | null> => {
    const existingProduct = products.find(p => p.id === id);
    if (existingProduct) {
      return existingProduct;
    }

    try {
      const fetchedProduct = await getProductByIdFromService(id);
      if (fetchedProduct) {
        setProducts(prev => [...prev, fetchedProduct]);
      }
      return fetchedProduct;
    } catch (err) {
      console.error(`Error fetching product by id ${id}:`, err);
      throw err;
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        error,
        refreshProducts,
        getProductById: fetchProductById,
        getProductsByCategory: getProductsByCategoryFromService,
        addProduct: addNewProduct,
        updateProduct: updateExistingProduct,
        deleteProduct: removeProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};
