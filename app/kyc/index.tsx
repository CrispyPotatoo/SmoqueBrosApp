import { useAppDialog } from '@/components/AppDialogProvider';
import { useSession } from '@/context/SessionProvider';
import { getKYCStatus, KYCStatus, submitKYC } from '@/services/kyc';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const ID_TYPES = [
  'National ID',
  'Driver\'s License',
  'Passport',
  'Voter\'s ID',
  'SSS ID',
  'PhilHealth ID',
] as const;

export default function KYCScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { showDialog } = useAppDialog();
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [idType, setIdType] = useState<typeof ID_TYPES[number]>('National ID');
  const [idNumber, setIdNumber] = useState('');
  const [showIdTypePicker, setShowIdTypePicker] = useState(false);

  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [idFrontUri, setIdFrontUri] = useState<string | null>(null);
  const [idBackUri, setIdBackUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [imagePickerType, setImagePickerType] = useState<'selfie' | 'id_front' | 'id_back' | null>(null);
  const [isImageSourceModalVisible, setIsImageSourceModalVisible] = useState(false);

  useEffect(() => {
    if (session?.uid) {
      loadKYCStatus();
    }
  }, [session]);

  const loadKYCStatus = async () => {
    try {
      if (!session?.uid) return;
      const status = await getKYCStatus(session.uid);
      setKycStatus(status);
    } catch (error) {
      console.error('Error loading KYC status:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showDialog({
          title: 'Permission Required',
          message: 'Camera permission is required to take photos for verification.',
        });
        return false;
      }
    }
    return true;
  };

  const pickImage = async (type: 'selfie' | 'id_front' | 'id_back') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Select Image Source',
      'Choose how you want to upload your photo',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(type),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickFromGallery(type),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async (type: 'selfie' | 'id_front' | 'id_back') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'selfie' ? [3, 4] : [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(type, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      showDialog({ title: 'Error', message: 'Failed to take photo. Please try again.' });
    }
  };

  const pickFromGallery = async (type: 'selfie' | 'id_front' | 'id_back') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'selfie' ? [3, 4] : [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(type, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showDialog({ title: 'Error', message: 'Failed to pick image. Please try again.' });
    }
  };

  const setImageUri = (type: 'selfie' | 'id_front' | 'id_back', uri: string) => {
    switch (type) {
      case 'selfie':
        setSelfieUri(uri);
        break;
      case 'id_front':
        setIdFrontUri(uri);
        break;
      case 'id_back':
        setIdBackUri(uri);
        break;
    }
  };

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      showDialog({ title: 'Validation Error', message: 'Please enter your full name' });
      return false;
    }
    if (!dateOfBirth.trim()) {
      showDialog({
        title: 'Validation Error',
        message: 'Please enter your date of birth (YYYY-MM-DD)',
      });
      return false;
    }
    if (!idNumber.trim()) {
      showDialog({ title: 'Validation Error', message: 'Please enter your ID number' });
      return false;
    }
    if (!selfieUri) {
      showDialog({ title: 'Validation Error', message: 'Please upload a selfie photo' });
      return false;
    }
    if (!idFrontUri) {
      showDialog({
        title: 'Validation Error',
        message: 'Please upload the front of your ID',
      });
      return false;
    }
    if (!idBackUri) {
      showDialog({
        title: 'Validation Error',
        message: 'Please upload the back of your ID',
      });
      return false;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      showDialog({
        title: 'Validation Error',
        message: 'Date of birth must be in YYYY-MM-DD format',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !session?.uid) return;

    setIsLoading(true);
    try {
      await submitKYC(session.uid, {
        fullName,
        dateOfBirth,
        idType,
        idNumber,
        selfieUri: selfieUri!,
        idFrontUri: idFrontUri!,
        idBackUri: idBackUri!,
      });

      showDialog({
        title: 'Success',
        message:
          'Your KYC verification has been submitted successfully. We will review your documents within 24-48 hours.',
        confirmText: 'OK',
        onConfirm: () => router.back(),
      });
    } catch (error) {
      console.error('KYC submission error:', error);
      showDialog({
        title: 'Error',
        message: 'Failed to submit KYC verification. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (kycStatus?.status === 'verified') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC Verification</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
            <Feather name="check-circle" size={60} color="#fff" />
          </View>
          <Text style={styles.statusTitle}>Verified</Text>
          <Text style={styles.statusMessage}>
            Your identity has been verified successfully!
          </Text>
          {kycStatus.verifiedAt && (
            <Text style={styles.statusDate}>
              Verified on {new Date(kycStatus.verifiedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (kycStatus?.status === 'pending') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC Verification</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
            <Feather name="clock" size={60} color="#fff" />
          </View>
          <Text style={styles.statusTitle}>Under Review</Text>
          <Text style={styles.statusMessage}>
            Your documents are being reviewed. This usually takes 24-48 hours.
          </Text>
          {kycStatus.submittedAt && (
            <Text style={styles.statusDate}>
              Submitted on {new Date(kycStatus.submittedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (kycStatus?.status === 'rejected') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC Verification</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: '#F44336' }]}>
            <Feather name="x-circle" size={60} color="#fff" />
          </View>
          <Text style={styles.statusTitle}>Verification Failed</Text>
          <Text style={styles.statusMessage}>
            {kycStatus.rejectionReason || 'Your verification was rejected. Please submit again with valid documents.'}
          </Text>
          <TouchableOpacity
            style={styles.resubmitButton}
            onPress={() => setKycStatus({ ...kycStatus, status: 'not_submitted' })}
          >
            <Text style={styles.resubmitButtonText}>Submit Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Feather name="shield" size={40} color="#007AFF" />
          <Text style={styles.infoTitle}>Verify Your Identity</Text>
          <Text style={styles.infoText}>
            To comply with regulations and ensure security, we need to verify your identity.
            This is a one-time process.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name (as shown on ID)</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={(text) => {
                // Remove numbers, only allow letters, spaces, and common name characters
                const filteredText = text.replace(/[0-9]/g, '');
                setFullName(filteredText);
              }}
              placeholder="Juan Dela Cruz"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={dateOfBirth ? styles.datePickerText : styles.datePickerPlaceholder}>
                {dateOfBirth || 'Select Date of Birth'}
              </Text>
              <Feather name="calendar" size={20} color="#666" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) {
                    setSelectedDate(date);
                    const formattedDate = date.toISOString().split('T')[0];
                    setDateOfBirth(formattedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>ID Type</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowIdTypePicker(!showIdTypePicker)}
            >
              <Text style={styles.pickerButtonText}>{idType}</Text>
              <Feather name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {showIdTypePicker && (
              <View style={styles.pickerContainer}>
                {ID_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.pickerItem}
                    onPress={() => {
                      setIdType(type);
                      setShowIdTypePicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>ID Number</Text>
            <TextInput
              style={styles.input}
              value={idNumber}
              onChangeText={(text) => {
                // Remove non-numeric characters, only allow numbers
                const filteredText = text.replace(/[^0-9]/g, '');
                setIdNumber(filteredText);
              }}
              placeholder="Enter your ID number"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Documents</Text>
          <Text style={styles.sectionSubtitle}>
            Please ensure photos are clear and all information is visible
          </Text>

          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => pickImage('selfie')}
          >
            {selfieUri ? (
              <Image source={{ uri: selfieUri }} style={styles.uploadedImage} />
            ) : (
              <>
                <View style={styles.uploadIconContainer}>
                  <Feather name="user" size={40} color="#007AFF" />
                </View>
                <Text style={styles.uploadTitle}>Selfie Photo</Text>
                <Text style={styles.uploadSubtitle}>Take a clear photo of your face</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => pickImage('id_front')}
          >
            {idFrontUri ? (
              <Image source={{ uri: idFrontUri }} style={styles.uploadedImage} />
            ) : (
              <>
                <View style={styles.uploadIconContainer}>
                  <Feather name="credit-card" size={40} color="#007AFF" />
                </View>
                <Text style={styles.uploadTitle}>ID Front</Text>
                <Text style={styles.uploadSubtitle}>Front side of your ID</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadCard}
            onPress={() => pickImage('id_back')}
          >
            {idBackUri ? (
              <Image source={{ uri: idBackUri }} style={styles.uploadedImage} />
            ) : (
              <>
                <View style={styles.uploadIconContainer}>
                  <Feather name="credit-card" size={40} color="#007AFF" />
                </View>
                <Text style={styles.uploadTitle}>ID Back</Text>
                <Text style={styles.uploadSubtitle}>Back side of your ID</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerCard}>
          <Feather name="info" size={20} color="#666" />
          <Text style={styles.disclaimerText}>
            Your information is encrypted and securely stored. We will never share your personal
            data without your consent.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
              <Feather name="arrow-right" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

	    {isImageSourceModalVisible && imagePickerType && (
	      <View style={styles.modalOverlay}>
	        <View style={styles.modalContainer}>
	          <Text style={styles.modalTitle}>Select Image Source</Text>
	          <Text style={styles.modalMessage}>Choose how you want to upload your photo</Text>
	          <View style={styles.modalButtonsColumn}>
	            <TouchableOpacity
	              style={styles.modalActionButton}
	              onPress={async () => {
	                setIsImageSourceModalVisible(false);
	                await takePhoto(imagePickerType);
	              }}
	            >
	              <Text style={styles.modalActionButtonText}>Take Photo</Text>
	            </TouchableOpacity>
	            <TouchableOpacity
	              style={styles.modalActionButton}
	              onPress={async () => {
	                setIsImageSourceModalVisible(false);
	                await pickFromGallery(imagePickerType);
	              }}
	            >
	              <Text style={styles.modalActionButtonText}>Choose from Gallery</Text>
	            </TouchableOpacity>
	            <TouchableOpacity
	              style={[styles.modalActionButton, styles.modalCancelButton]}
	              onPress={() => setIsImageSourceModalVisible(false)}
	            >
	              <Text style={[styles.modalActionButtonText, styles.modalCancelButtonText]}>Cancel</Text>
	            </TouchableOpacity>
	          </View>
	        </View>
	      </View>
	    )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#000',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#000',
  },
  datePickerButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  datePickerText: {
    fontSize: 16,
    color: '#000',
  },
  datePickerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  uploadCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    minHeight: 180,
    justifyContent: 'center',
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 12,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#000',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  statusBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  statusDate: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  resubmitButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  resubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
	modalOverlay: {
	  position: 'absolute',
	  top: 0,
	  left: 0,
	  right: 0,
	  bottom: 0,
	  backgroundColor: 'rgba(0, 0, 0, 0.35)',
	  justifyContent: 'center',
	  alignItems: 'center',
	  padding: 24,
	},
	modalContainer: {
	  width: '100%',
	  borderRadius: 16,
	  backgroundColor: '#fff',
	  padding: 20,
	  shadowColor: '#000',
	  shadowOffset: { width: 0, height: 4 },
	  shadowOpacity: 0.15,
	  shadowRadius: 12,
	  elevation: 6,
	},
	modalTitle: {
	  fontSize: 18,
	  fontWeight: '700',
	  color: '#111827',
	  marginBottom: 8,
	},
	modalMessage: {
	  fontSize: 14,
	  color: '#4b5563',
	  marginBottom: 16,
	},
	modalButtonsColumn: {
	  gap: 8,
	},
	modalActionButton: {
	  paddingVertical: 12,
	  paddingHorizontal: 16,
	  borderRadius: 999,
	  alignItems: 'center',
	  backgroundColor: '#000',
	},
	modalActionButtonText: {
	  color: '#fff',
	  fontSize: 14,
	  fontWeight: '600',
	},
	modalCancelButton: {
	  backgroundColor: '#fff',
	  borderWidth: 1,
	  borderColor: '#e5e7eb',
	},
	modalCancelButtonText: {
	  color: '#374151',
	},
});
