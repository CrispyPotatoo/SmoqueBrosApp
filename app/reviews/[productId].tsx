import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../../components/AppDialogProvider';
import { useSession } from '../../context/SessionProvider';
import { getProductById, Product } from '../../services/products';
import {
    addReview,
    getProductReviews,
    hasUserReviewedProduct,
    Review
} from '../../services/reviews';

export default function ReviewsScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { productId } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { showDialog } = useAppDialog();

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    if (!productId || typeof productId !== 'string') return;

    setIsLoading(true);
    try {
      const [productData, reviewsData] = await Promise.all([
        getProductById(productId),
        getProductReviews(productId)
      ]);

      setProduct(productData);
      setReviews(reviewsData);

      if (session) {
        const reviewed = await hasUserReviewedProduct(session.uid, productId);
        setHasReviewed(reviewed);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showDialog({ title: 'Error', message: 'Failed to load reviews' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!session) {
      showDialog({
        title: 'Sign In Required',
        message: 'Please sign in to submit a review.',
        cancelText: 'Cancel',
        confirmText: 'Sign In',
        onConfirm: () => router.push('/(auth)/'),
      });
      return;
    }

    if (rating === 0) {
      showDialog({
        title: 'Rating Required',
        message: 'Please select a rating before submitting.',
      });
      return;
    }

    if (comment.trim().length < 10) {
      showDialog({
        title: 'Comment Too Short',
        message: 'Please write at least 10 characters.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addReview(
        productId as string,
        product?.name || 'Unknown Product',
        session.uid,
        session.username || 'Anonymous',
        rating,
        comment.trim()
      );

      showDialog({ title: 'Success', message: 'Your review has been submitted!' });
      setShowReviewForm(false);
      setRating(0);
      setComment('');
      loadData();
    } catch (error) {
      console.error('Error submitting review:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to submit review. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, onPress?: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={onPress ? 32 : 20}
              color="#FFD700"
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const calculateRatingStats = () => {
    if (reviews.length === 0) return { average: 0, distribution: [0, 0, 0, 0, 0] };

    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      distribution[review.rating - 1]++;
    });

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = totalRating / reviews.length;

    return { average, distribution };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  const stats = calculateRatingStats();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reviews & Ratings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {product && (
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.averageRatingContainer}>
              <Text style={styles.averageRating}>
                {stats.average.toFixed(1)}
              </Text>
              {renderStars(Math.round(stats.average))}
              <Text style={styles.totalReviews}>
                Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>

            <View style={styles.distributionContainer}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star - 1];
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <View key={star} style={styles.distributionRow}>
                    <Text style={styles.distributionStar}>{star}</Text>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <View style={styles.distributionBar}>
                      <View
                        style={[
                          styles.distributionFill,
                          { width: `${percentage}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.distributionCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {session && !hasReviewed && (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => setShowReviewForm(!showReviewForm)}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}

          {showReviewForm && (
            <View style={styles.reviewForm}>
              <Text style={styles.formTitle}>Your Rating</Text>
              {renderStars(rating, setRating)}

              <Text style={styles.formTitle}>Your Review</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience with this product..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={5}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowReviewForm(false);
                    setRating(0);
                    setComment('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (isSubmitting || rating === 0) && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmitReview}
                  disabled={isSubmitting || rating === 0}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.reviewsList}>
            <Text style={styles.reviewsTitle}>
              Customer Reviews ({reviews.length})
            </Text>

            {reviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbox-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No reviews yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Be the first to review this product!
                </Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {review.user_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewUserName}>{review.user_name}</Text>
                        <Text style={styles.reviewDate}>
                          {formatDate(review.created_at)}
                        </Text>
                      </View>
                    </View>
                    {renderStars(review.rating)}
                  </View>

                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  productInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  statsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  averageRatingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    marginHorizontal: 2,
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
  },
  distributionContainer: {
    marginTop: 10,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionStar: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    width: 20,
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  distributionCount: {
    fontSize: 12,
    color: '#666',
    width: 30,
    textAlign: 'right',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  writeReviewText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewForm: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    minHeight: 100,
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewsList: {
    padding: 16,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  helpfulText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
});
