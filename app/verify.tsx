import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDialog } from '../components/AppDialogProvider';
import { db } from '../constants/firebaseConfig';
import { useSession } from '../context/SessionProvider';

export default function VerifyAgeScreen() {
  const router = useRouter();
  const { session, reloadSession } = useSession();
  const [isVerifying, setIsVerifying] = useState(false);
  const { showDialog } = useAppDialog();

  const handleVerify = async () => {
    if (!session) {
      showDialog({
        title: 'Error',
        message: 'You must be logged in to verify your age.',
      });
      return;
    }

    setIsVerifying(true);

    // Simulate a network delay for the verification process
    setTimeout(async () => {
      try {
        const userDocRef = doc(db, 'users', session.uid);
        await updateDoc(userDocRef, {
          isAgeVerified: true,
        });

        // Reload session to get the updated user data
        await reloadSession();

        showDialog({ title: 'Success', message: 'Your age has been verified!' });
        router.replace('/(tabs)'); // Navigate to the main app
      } catch (error) {
        console.error('Verification error:', error);
        showDialog({
          title: 'Error',
          message: 'Could not complete verification. Please try again.',
        });
      } finally {
        setIsVerifying(false);
      }
    }, 3000); // 3-second delay to simulate processing
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Feather name="shield" size={60} color="#2c3e50" />
        <Text style={styles.title}>Age Verification Required</Text>
        <Text style={styles.description}>
          To continue, you need to verify that you are 18 years of age or older. This is a one-time step.
        </Text>
        <Text style={styles.infoText}>
          For this project, clicking 'Verify' will simulate a successful ID check.
        </Text>

        <TouchableOpacity
          style={[styles.verifyButton, isVerifying && styles.disabledButton]}
          onPress={handleVerify}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify My Age</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  verifyButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#8e8e93',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
