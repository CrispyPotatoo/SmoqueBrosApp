import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../constants/firebaseConfig';
import { supabase } from '../constants/supabaseConfig';

const PROFILE_BUCKET = 'profile_images';

export interface ProfilePictureOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

/**
 * Request camera permissions
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera permission is required to take photos.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

/**
 * Request media library permissions
 */
export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Media library permission is required to select photos.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

/**
 * Take a photo using camera
 */
export const takePhoto = async (
  options: ProfilePictureOptions = {}
): Promise<ImagePicker.ImagePickerAsset | null> => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: options.allowsEditing ?? true,
    aspect: options.aspect ?? [1, 1],
    quality: options.quality ?? 0.8,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }

  return null;
};

/**
 * Pick an image from device gallery
 */
export const pickImage = async (
  options: ProfilePictureOptions = {}
): Promise<ImagePicker.ImagePickerAsset | null> => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing ?? true,
    aspect: options.aspect ?? [1, 1],
    quality: options.quality ?? 0.8,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }

  return null;
};

/**
 * Show action sheet to choose between camera and gallery
 */
export const showImagePickerOptions = (): Promise<'camera' | 'gallery' | null> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => resolve('camera'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => resolve('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true }
    );
  });
};

/**
 * Delete old profile picture from Supabase storage
 */
export const deleteOldProfilePicture = async (oldPhotoUrl: string): Promise<void> => {
  if (!oldPhotoUrl) return;

  try {
    const urlParts = oldPhotoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const folderPath = urlParts[urlParts.length - 2];
    const filePath = `${folderPath}/${fileName}`;

    const { error } = await supabase.storage
      .from(PROFILE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting old profile picture:', error);
    } else {
      console.log('✅ Old profile picture deleted:', filePath);
    }
  } catch (error) {
    console.error('Error in deleteOldProfilePicture:', error);
  }
};

/**
 * Upload profile picture to Supabase storage
 */
export const uploadProfilePicture = async (
  userId: string,
  imageUri: string
): Promise<string> => {
  try {
    console.log('📤 Starting upload for user:', userId);
    console.log('📤 Image URI:', imageUri);

    // Fetch the image
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Convert to ArrayBuffer (better for React Native)
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log('📤 Image size:', uint8Array.length, 'bytes');

    const fileExt = imageUri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `profile_${userId}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log('📤 Uploading to path:', filePath);

    // Check if bucket exists by trying to list files
    const { data: bucketData, error: bucketError } = await supabase.storage
      .from(PROFILE_BUCKET)
      .list(userId, { limit: 1 });

    if (bucketError) {
      console.error('❌ Bucket error:', bucketError);
      throw new Error(`Storage bucket '${PROFILE_BUCKET}' may not exist or is not accessible. Please create it in Supabase Dashboard.`);
    }

    console.log('✅ Bucket accessible');

    // Upload using Uint8Array (React Native compatible)
    const { data, error } = await supabase.storage
      .from(PROFILE_BUCKET)
      .upload(filePath, uint8Array, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_BUCKET)
      .getPublicUrl(filePath);

    console.log('✅ Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error);
    throw error;
  }
};

/**
 * Update user's profile picture in Firestore
 */
export const updateUserProfilePicture = async (
  userId: string,
  photoUrl: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      photoUrl,
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Profile picture updated in Firestore');
  } catch (error) {
    console.error('Error updating profile picture in Firestore:', error);
    throw error;
  }
};

/**
 * Get user's current profile picture URL
 */
export const getUserProfilePicture = async (userId: string): Promise<string | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.photoUrl || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile picture:', error);
    return null;
  }
};

/**
 * Complete profile picture update flow
 * 1. Get old photo URL
 * 2. Upload new photo
 * 3. Update Firestore
 * 4. Delete old photo
 */
export const updateProfilePictureComplete = async (
  userId: string,
  imageUri: string
): Promise<string> => {
  try {
    // Get old photo URL
    const oldPhotoUrl = await getUserProfilePicture(userId);

    // Upload new photo
    const newPhotoUrl = await uploadProfilePicture(userId, imageUri);

    // Update Firestore with new photo URL
    await updateUserProfilePicture(userId, newPhotoUrl);

    // Delete old photo if it exists
    if (oldPhotoUrl) {
      await deleteOldProfilePicture(oldPhotoUrl);
    }

    return newPhotoUrl;
  } catch (error) {
    console.error('Error in updateProfilePictureComplete:', error);
    throw error;
  }
};
