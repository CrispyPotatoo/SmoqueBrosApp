import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../constants/firebaseConfig';

export interface Review {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  order_id?: string;
  created_at: Date;
  updated_at: Date;
}

const REVIEWS_COLLECTION = 'reviews';

const transformReviewData = (id: string, data: any): Review => {
  let createdAt = new Date();
  let updatedAt = new Date();
  
  if (data.created_at) {
    if (data.created_at.toDate && typeof data.created_at.toDate === 'function') {
      createdAt = data.created_at.toDate();
    } else if (data.created_at instanceof Date) {
      createdAt = data.created_at;
    }
  }

  if (data.updated_at) {
    if (data.updated_at.toDate && typeof data.updated_at.toDate === 'function') {
      updatedAt = data.updated_at.toDate();
    } else if (data.updated_at instanceof Date) {
      updatedAt = data.updated_at;
    }
  }

  return {
    id,
    product_id: data.product_id || '',
    product_name: data.product_name || '',
    user_id: data.user_id || '',
    user_name: data.user_name || 'Anonymous',
    rating: typeof data.rating === 'number' ? data.rating : parseInt(data.rating) || 0,
    comment: data.comment || '',
    order_id: data.order_id,
    created_at: createdAt,
    updated_at: updatedAt
  };
};

export const getProductReviews = async (productId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    const q = query(
      reviewsRef,
      where('product_id', '==', productId)
    );
    
    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs.map(doc => 
      transformReviewData(doc.id, doc.data())
    );
    
    reviews.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return reviews;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
};

export const getUserReviews = async (userId: string): Promise<Review[]> => {
  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    const q = query(
      reviewsRef,
      where('user_id', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs.map(doc => 
      transformReviewData(doc.id, doc.data())
    );
    
    reviews.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return reviews;
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    throw error;
  }
};

export const addReview = async (
  productId: string,
  productName: string,
  userId: string,
  userName: string,
  rating: number,
  comment: string,
  orderId?: string
): Promise<Review> => {
  try {
    const reviewData = {
      product_id: productId,
      product_name: productName,
      user_id: userId,
      user_name: userName,
      rating,
      comment,
      order_id: orderId || '',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    const docRef = await addDoc(reviewsRef, reviewData);

    await updateProductRating(productId);

    return {
      id: docRef.id,
      ...reviewData,
      created_at: new Date(),
      updated_at: new Date()
    } as Review;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

export const updateProductRating = async (productId: string): Promise<void> => {
  try {
    const reviews = await getProductReviews(productId);
    
    if (reviews.length === 0) {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        rating: 0,
        reviews: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      rating: Math.round(averageRating * 10) / 10,
      reviews: reviews.length
    });
  } catch (error) {
    console.error('Error updating product rating:', error);
    throw error;
  }
};

export const hasUserReviewedProduct = async (
  userId: string,
  productId: string
): Promise<boolean> => {
  try {
    const reviewsRef = collection(db, REVIEWS_COLLECTION);
    const q = query(
      reviewsRef,
      where('user_id', '==', userId),
      where('product_id', '==', productId)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking user review:', error);
    return false;
  }
};
