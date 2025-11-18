import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth } from '../../constants/firebaseConfig';
import { useSession } from '../../context/SessionProvider';
import { Address, getDefaultAddress } from '../../services/address';
import { getKYCStatus, KYCStatus } from '../../services/kyc';
import {
    cleanupExpoPushTokens, initializeNotifications, setNotificationsEnabledCache
} from '../../services/notifications';
import { getOrdersByUserId, Order } from '../../services/orders';
import {
    getUserProfilePicture,
    pickImage,
    showImagePickerOptions,
    takePhoto,
    updateProfilePictureComplete,
} from '../../services/profilePicture';

// Helper function to get status badge styling
const getStatusStyle = (status: string) => {
  const statusLower = status?.toLowerCase() || '';

  switch (statusLower) {
    case 'preparing':
      return { backgroundColor: '#FFF8E1', color: '#F57F17' };
    case 'processing':
      return { backgroundColor: '#E0F7FA', color: '#006064' };
    case 'shipped':
      return { backgroundColor: '#E3F2FD', color: '#0D47A1' };
    case 'completed':
      return { backgroundColor: '#E8F5E9', color: '#1B5E20' };
    case 'cancelled':
      return { backgroundColor: '#FFEBEE', color: '#B71C1C' };
    default:
      return { backgroundColor: '#F5F5F5', color: '#666' };
  }
};

const NOTIFICATIONS_ENABLED_KEY_PREFIX = 'notifications_enabled_';

export default function YouScreen() {
  const { session, signOut, isLoading } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [isKycLoading, setIsKycLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [isAddressLoading, setIsAddressLoading] = useState(true);
  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);

  const fetchOrders = async () => {
    if (!session?.uid) return;
    setIsOrdersLoading(true);
    try {
      const userOrders = await getOrdersByUserId(session.uid);
      console.log('📦 Fetched orders:', userOrders.length);
      if (userOrders.length > 0) {
        console.log('📦 First order items:', userOrders[0].items);
        if (userOrders[0].items.length > 0) {
          console.log('📦 First item productId:', userOrders[0].items[0].productId);
        }
      }
      setOrders(userOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      // Alert.alert('Error', 'Could not fetch your orders.');
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (!session?.uid) return;

    try {
      const key = `${NOTIFICATIONS_ENABLED_KEY_PREFIX}${session.uid}`;
      await AsyncStorage.setItem(key, value ? 'true' : 'false');

      setNotificationsEnabledCache(session.uid, value);

      if (value) {
        await initializeNotifications(session.uid);
      } else {
        await cleanupExpoPushTokens(session.uid);
      }
    } catch (error) {
      // Alert.alert('Error', 'Failed to update notification preference. Please try again.');
    }
  };

  const fetchAddresses = async () => {
    if (!session?.uid) return;
    setIsAddressLoading(true);
    try {
      const defaultAddr = await getDefaultAddress(session.uid);
      setDefaultAddress(defaultAddr);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setIsAddressLoading(false);
    }
  };

  const fetchKycStatus = async () => {
    if (!session?.uid) return;
    setIsKycLoading(true);
    try {
      const status = await getKYCStatus(session.uid);
      setKycStatus(status);
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    } finally {
      setIsKycLoading(false);
    }
  };

  const fetchProfilePicture = async () => {
    if (!session?.uid) return;
    try {
      const photoUrl = await getUserProfilePicture(session.uid);
      setProfilePicture(photoUrl);
    } catch (error) {
      console.error('Failed to fetch profile picture:', error);
    }
  };

  const handleChangeProfilePicture = async () => {
    if (!session?.uid) return;

    const choice = await showImagePickerOptions();
    if (!choice) return;

    setIsUploadingPhoto(true);
    try {
      let imageAsset = null;

      if (choice === 'camera') {
        imageAsset = await takePhoto();
      } else {
        imageAsset = await pickImage();
      }

      if (!imageAsset) {
        setIsUploadingPhoto(false);
        return;
      }

      const newPhotoUrl = await updateProfilePictureComplete(session.uid, imageAsset.uri);
      setProfilePicture(newPhotoUrl);
      // Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error updating profile picture:', error);
      // Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSignOut = () => {
    setIsSignOutModalVisible(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSignOutModalVisible(false);
    try {
      await signOut();
      router.replace('/(auth)');
    } catch (error) {
      // Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  useEffect(() => {
    if (session) {
      fetchOrders();
      fetchKycStatus();
      fetchProfilePicture();
      fetchAddresses();
    }
  }, [session]);

  useEffect(() => {
    const loadNotificationPreference = async () => {
      if (!session?.uid) return;
      try {
        const key = `${NOTIFICATIONS_ENABLED_KEY_PREFIX}${session.uid}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored !== null) {
          setNotificationsEnabled(stored === 'true');
        }
      } catch (error) {
        // Ignore errors and keep default (enabled)
      }
    };

    loadNotificationPreference();
  }, [session?.uid]);

  useFocusEffect(
    React.useCallback(() => {
      if (session) {
        fetchOrders();
        fetchKycStatus();
        fetchProfilePicture();
        fetchAddresses();
      }
    }, [session])
  );

  const toggleSection = (section: string) => {
    const nextSection = expandedSection === section ? null : section;
    if (nextSection === 'address') {
      fetchAddresses();
    }
    setExpandedSection(nextSection);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      // Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      // Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      // Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user logged in');
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      // Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setExpandedSection(null);
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        // Alert.alert('Error', 'Current password is incorrect');
      } else if (error.code === 'auth/too-many-requests') {
        // Alert.alert('Error', 'Too many attempts. Please try again later');
      } else {
        // Alert.alert('Error', 'Failed to change password. Please try again');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleManageAddresses = () => {
    router.push('/address');
  };

  const latestOrder = orders.length > 0 ? orders[0] : null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#000" style={styles.centered} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.signInText}>Please sign in to view your profile</Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/(auth)/sign-in')}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <>
            {/* Profile Picture Section */}
            <View style={styles.profilePictureContainer}>
              <TouchableOpacity
                style={styles.profilePictureWrapper}
                onPress={handleChangeProfilePicture}
                disabled={isUploadingPhoto}
              >
                {profilePicture ? (
                  <Image
                    source={{ uri: profilePicture }}
                    style={styles.profilePicture}
                  />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Ionicons name="person" size={50} color="#999" />
                  </View>
                )}
                {isUploadingPhoto ? (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : (
                  <View style={styles.cameraIconContainer}>
                    <Ionicons name="camera" size={18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Username Section */}
            <View style={styles.usernameSection}>
              <View style={styles.usernameDisplay}>
                <Text style={styles.usernameText}>@{session.username || 'username'}</Text>
              </View>
            </View>

            {/* KYC Status Section */}
            {!isKycLoading && kycStatus && kycStatus.status !== 'verified' && (
              <TouchableOpacity
                style={styles.kycCard}
                onPress={() => router.push('/kyc')}
              >
                <View style={styles.kycIconContainer}>
                  <Feather name="alert-circle" size={24} color="#007AFF" />
                </View>
                <View style={styles.kycContent}>
                  <Text style={styles.kycTitle}>Verify Your Identity</Text>
                  <Text style={styles.kycSubtitle}>Complete KYC for secure transactions</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            )}

            {!isKycLoading && kycStatus && kycStatus.status === 'verified' && (
              <View style={styles.verifiedCard}>
                <View style={styles.verifiedIconContainer}>
                  <Feather name="check-circle" size={24} color="#4CAF50" />
                </View>
                <View style={styles.verifiedContent}>
                  <Text style={styles.verifiedTitle}>Verified Account</Text>
                  <Text style={styles.verifiedSubtitle}>Your identity has been verified</Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>My Orders</Text>
                <TouchableOpacity onPress={() => router.push('/orders')}>
                  <Text style={styles.viewAllLink}>View Orders</Text>
                </TouchableOpacity>
              </View>

              {isOrdersLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : latestOrder ? (
                <>
                  <Text style={styles.ordersSummaryText}>
                    {orders.length === 1
                      ? 'You have 1 order.'
                      : `You have ${orders.length} orders.`}
                  </Text>
                  <TouchableOpacity
                    style={styles.latestOrderPreview}
                    onPress={() => router.push(`/tracking/${latestOrder.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.latestOrderLeft}>
                      <Text style={styles.latestOrderId}>#{latestOrder.id.substring(0, 8).toUpperCase()}</Text>
                      <Text style={styles.latestOrderDate}>
                        {(latestOrder.created_at?.toDate?.() || latestOrder.createdAt?.toDate?.() || new Date()).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )}
                      </Text>
                    </View>
                    <View style={styles.latestOrderRight}>
                      <Text style={styles.latestOrderTotal}>
                        ₱{(latestOrder.total_amount || latestOrder.total || 0).toFixed(2)}
                      </Text>
                      <View style={[styles.statusBadge, getStatusStyle(latestOrder.status)]}>
                        <Text style={styles.statusText}>{latestOrder.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.noOrdersText}>You haven't placed any orders yet.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account Settings</Text>

              <View style={styles.settingItem}>
                <View style={styles.settingHeader}>
                  <View style={styles.settingHeaderLeft}>
                    <Ionicons name="notifications-outline" size={24} color="#000" />
                    <View>
                      <Text style={styles.settingTitle}>Allow Notifications</Text>
                      <Text style={styles.settingSubtitle}>
                        {notificationsEnabled ? 'On' : 'Off'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleToggleNotifications}
                  />
                </View>
              </View>

              <View style={styles.settingItem}>
                <TouchableOpacity
                  style={styles.settingHeader}
                  onPress={() => toggleSection('password')}
                >
                  <View style={styles.settingHeaderLeft}>
                    <Ionicons name="lock-closed-outline" size={24} color="#000" />
                    <Text style={styles.settingTitle}>Change Password</Text>
                  </View>
                  <Ionicons
                    name={expandedSection === 'password' ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {expandedSection === 'password' && (
                  <View style={styles.settingContent}>
                    <TextInput
                      style={styles.input}
                      placeholder="Current Password"
                      placeholderTextColor="#999"
                      secureTextEntry
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="New Password"
                      placeholderTextColor="#999"
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm New Password"
                      placeholderTextColor="#999"
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity
                      style={[styles.saveButton, isChangingPassword && styles.saveButtonDisabled]}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.settingItem}>
                <TouchableOpacity
                  style={styles.settingHeader}
                  onPress={() => toggleSection('address')}
                >
                  <View style={styles.settingHeaderLeft}>
                    <Ionicons name="location-outline" size={24} color="#000" />
                    <View>
                      <Text style={styles.settingTitle}>Delivery Address</Text>
                      {defaultAddress && (
                        <Text style={styles.settingSubtitle}>
                          {defaultAddress.barangay}, {defaultAddress.city}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name={expandedSection === 'address' ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {expandedSection === 'address' && (
                  <View style={styles.settingContent}>
                    {isAddressLoading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : defaultAddress ? (
                      <View style={styles.addressDetails}>
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                        </View>
                        <Text style={styles.addressName}>{defaultAddress.name}</Text>
                        <Text style={styles.addressPhone}>{defaultAddress.phone_number}</Text>
                        <Text style={styles.addressText}>
                          {`${defaultAddress.house_street}, ${defaultAddress.barangay}, ${defaultAddress.city}, ${defaultAddress.province} ${defaultAddress.postal_code}`}
                        </Text>
                        <TouchableOpacity
                          style={styles.manageButton}
                          onPress={handleManageAddresses}
                        >
                          <Text style={styles.manageButtonText}>Manage All Addresses</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.noDefaultContainer}>
                        <Text style={styles.noDefaultText}>No default address set</Text>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={handleManageAddresses}
                        >
                          <Text style={styles.saveButtonText}>Add Address</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            <Modal
              visible={isSignOutModalVisible}
              transparent
              animationType="fade"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Sign Out</Text>
                  <Text style={styles.modalMessage}>
                    Are you sure you want to sign out?
                  </Text>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonSecondary]}
                      onPress={() => setIsSignOutModalVisible(false)}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonSecondaryText]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonPrimary]}
                      onPress={handleConfirmSignOut}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePictureWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  usernameSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  usernameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameText: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  usernameEdit: {
    width: '100%',
    alignItems: 'center',
  },
  usernameInput: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  usernameButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#000',
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  kycCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  kycIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kycContent: {
    flex: 1,
  },
  kycTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  kycSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  verifiedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  verifiedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  verifiedContent: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 2,
  },
  verifiedSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  viewAllLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ordersSummaryText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  latestOrderPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ececec',
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  latestOrderLeft: {
    flex: 1,
  },
  latestOrderId: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  latestOrderDate: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  latestOrderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  latestOrderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  contactLink: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  contactLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  settingContent: {
    paddingTop: 8,
    gap: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  addressDetails: {
    gap: 8,
  },
  manageButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  manageButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  noDefaultContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noDefaultText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  noOrdersText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  signInText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
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
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    minWidth: 90,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtonPrimary: {
    backgroundColor: '#d9534f',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonSecondaryText: {
    color: '#374151',
  },
  modalButtonPrimaryText: {
    color: '#fff',
  },
});
