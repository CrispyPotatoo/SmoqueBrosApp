import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../components/AppDialogProvider';
import { auth } from '../constants/firebaseConfig';
import { useSession } from '../context/SessionProvider';
import { Address, getDefaultAddress } from '../services/address';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, updateUsername } = useSession();
  const { showDialog } = useAppDialog();
  
  // Expandable sections state
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Change Username states
  const [newUsername, setNewUsername] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  
  // Address states
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [isAddressLoading, setIsAddressLoading] = useState(true);

  // Fetch addresses on mount
  useEffect(() => {
    if (session?.uid) {
      fetchAddresses();
    }
  }, [session]);

  // Reload addresses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (session?.uid) {
        fetchAddresses();
      }
    }, [session])
  );

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showDialog({ title: 'Error', message: 'Please fill in all password fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      showDialog({ title: 'Error', message: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      showDialog({ title: 'Error', message: 'Password must be at least 6 characters' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user logged in');
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      showDialog({ title: 'Success', message: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setExpandedSection(null);
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        showDialog({ title: 'Error', message: 'Current password is incorrect' });
      } else if (error.code === 'auth/too-many-requests') {
        showDialog({
          title: 'Error',
          message: 'Too many attempts. Please try again later',
        });
      } else {
        showDialog({
          title: 'Error',
          message: 'Failed to change password. Please try again',
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      showDialog({ title: 'Error', message: 'Please enter a new username' });
      return;
    }

    setIsChangingUsername(true);
    try {
      await updateUsername(newUsername.trim());
      showDialog({ title: 'Success', message: 'Username updated successfully!' });
      setNewUsername('');
      setExpandedSection(null);
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: error.message || 'Failed to update username',
      });
    } finally {
      setIsChangingUsername(false);
    }
  };

  const handleManageAddresses = () => {
    router.push('/address');
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.signInText}>Please sign in to access settings</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          {/* Change Password */}
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
                  style={[styles.saveButton, isChangingPassword && styles.disabledButton]}
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

          {/* Change Username */}
          <View style={styles.settingItem}>
            <TouchableOpacity
              style={styles.settingHeader}
              onPress={() => toggleSection('username')}
            >
              <View style={styles.settingHeaderLeft}>
                <Ionicons name="person-outline" size={24} color="#000" />
                <View>
                  <Text style={styles.settingTitle}>Change Username</Text>
                  <Text style={styles.settingSubtitle}>Current: @{session.username}</Text>
                </View>
              </View>
              <Ionicons
                name={expandedSection === 'username' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {expandedSection === 'username' && (
              <View style={styles.settingContent}>
                <TextInput
                  style={styles.input}
                  placeholder="New Username"
                  placeholderTextColor="#999"
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.saveButton, isChangingUsername && styles.disabledButton]}
                  onPress={handleChangeUsername}
                  disabled={isChangingUsername}
                >
                  {isChangingUsername ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Username</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Delivery Address */}
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
                  <View style={styles.noAddressContainer}>
                    <Text style={styles.noAddressText}>No default address set</Text>
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

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutCard}>
            <View style={styles.aboutItem}>
              <View style={styles.aboutItemLeft}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <Text style={styles.aboutLabel}>App Version</Text>
              </View>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>

            <View style={styles.aboutDivider} />

            <View style={styles.aboutItem}>
              <View style={styles.aboutItemLeft}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={styles.aboutLabel}>Account Email</Text>
              </View>
              <Text style={styles.aboutValue} numberOfLines={1} ellipsizeMode="tail">{session.email}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  signInText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#000',
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
  },
  addressDetails: {
    gap: 8,
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
    marginBottom: 12,
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
  noAddressContainer: {
    gap: 12,
  },
  noAddressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  aboutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  aboutLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
    maxWidth: '60%',
  },
  aboutDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});
