import { db } from '@/constants/firebaseConfig';
import { supabase } from '@/constants/supabaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export interface KYCData {
  userId: string;
  fullName: string;
  dateOfBirth: string;
  idType: 'National ID' | 'Driver\'s License' | 'Passport' | 'Voter\'s ID' | 'SSS ID' | 'PhilHealth ID';
  idNumber: string;
  selfieUrl?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface KYCStatus {
  isVerified: boolean;
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  submittedAt?: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export const uploadImageToSupabase = async (
  uri: string,
  userId: string,
  imageType: 'selfie' | 'id_front' | 'id_back'
): Promise<string> => {
  try {
    console.log(`📤 Uploading ${imageType}...`);
    console.log(`📍 URI: ${uri.substring(0, 50)}...`);

    // Fetch the image
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Convert to ArrayBuffer (better for React Native)
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`📦 File size: ${uint8Array.length} bytes`);
    
    const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `${userId}/${imageType}_${Date.now()}.${fileExt}`;
    const filePath = `kyc/${fileName}`;

    console.log(`📁 Uploading to: ${filePath}`);
    console.log(`🔗 Bucket: kyc-documents`);

    // Upload using ArrayBuffer
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, uint8Array, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to upload ${imageType}: ${error.message}`);
    }

    console.log(`✅ Upload successful:`, data);

    const { data: urlData } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(filePath);

    console.log(`🔗 Public URL: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`❌ Error uploading ${imageType}:`, error);
    console.error(`❌ Error type: ${error.constructor.name}`);
    console.error(`❌ Error message: ${error.message}`);
    throw error;
  }
};

export const submitKYC = async (
  userId: string,
  kycData: {
    fullName: string;
    dateOfBirth: string;
    idType: KYCData['idType'];
    idNumber: string;
    selfieUri: string;
    idFrontUri: string;
    idBackUri: string;
  }
): Promise<void> => {
  try {
    console.log('📤 Starting KYC submission...');

    const selfieUrl = await uploadImageToSupabase(kycData.selfieUri, userId, 'selfie');
    console.log('✅ Selfie uploaded');

    const idFrontUrl = await uploadImageToSupabase(kycData.idFrontUri, userId, 'id_front');
    console.log('✅ ID Front uploaded');

    const idBackUrl = await uploadImageToSupabase(kycData.idBackUri, userId, 'id_back');
    console.log('✅ ID Back uploaded');

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      kyc: {
        fullName: kycData.fullName,
        dateOfBirth: kycData.dateOfBirth,
        idType: kycData.idType,
        idNumber: kycData.idNumber,
        selfieUrl,
        idFrontUrl,
        idBackUrl,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      },
      isAgeVerified: true,
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ KYC data saved to Firestore');
  } catch (error) {
    console.error('❌ KYC submission error:', error);
    throw error;
  }
};

export const getKYCStatus = async (userId: string): Promise<KYCStatus> => {
  try {
    console.log('🔍 Checking KYC status for user:', userId);
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('❌ User document does not exist');
      return {
        isVerified: false,
        status: 'not_submitted',
      };
    }

    const userData = userDoc.data();
    const kyc = userData.kyc;

    console.log('📄 User data:', JSON.stringify(userData, null, 2));
    console.log('🔐 KYC data:', JSON.stringify(kyc, null, 2));

    if (!kyc) {
      console.log('❌ No KYC data found');
      return {
        isVerified: false,
        status: 'not_submitted',
      };
    }

    console.log('✅ KYC Status:', kyc.status);
    console.log('✅ Is Verified:', kyc.status === 'verified');

    return {
      isVerified: kyc.status === 'verified',
      status: kyc.status || 'not_submitted',
      submittedAt: kyc.submittedAt ? new Date(kyc.submittedAt) : undefined,
      verifiedAt: kyc.verifiedAt ? new Date(kyc.verifiedAt) : undefined,
      rejectionReason: kyc.rejectionReason,
    };
  } catch (error) {
    console.error('❌ Error getting KYC status:', error);
    throw error;
  }
};
