import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
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
import { checkEmailVerificationStatus, sendVerificationEmailByCredentials } from '../../services/auth';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const { showDialog } = useAppDialog();

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email address');
      setMessageType('error');
      return;
    }

    if (!password.trim()) {
      setMessage('Please enter your password to resend verification email');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      await sendVerificationEmailByCredentials(email, password);
      setMessage('Verification email has been sent! Please check your inbox and spam folder.');
      setMessageType('success');
    } catch (error: any) {
      if (error.message?.includes('No account found')) {
        setMessage('No account found with this email address.');
        setMessageType('error');
      } else {
        setMessage(error.message || 'Failed to send verification email');
        setMessageType('error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const isVerified = await checkEmailVerificationStatus();
      if (isVerified) {
        showDialog({
          title: 'Email Verified!',
          message: 'Your email has been successfully verified. You can now sign in.',
          confirmText: 'Sign In',
          onConfirm: () => router.replace('/(auth)'),
        });
      } else {
        showDialog({
          title: 'Not Verified Yet',
          message:
            'Your email is not verified yet. Please check your inbox and click the verification link, or resend the verification email.',
        });
      }
    } catch (error: any) {
      showDialog({
        title: 'Error',
        message: 'Failed to check verification status. Please try again.',
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Verify Email',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={80} color="#000" />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification email to your inbox. Please check your email and click the verification link to activate your account.
          </Text>

          {message ? (
            <View style={[styles.messageContainer, messageType === 'error' ? styles.errorMessage : styles.successMessage]}>
              <Text style={[styles.messageText, messageType === 'error' ? styles.errorText : styles.successText]}>
                {message}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#8e8e93"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setMessage('');
                setMessageType('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8e8e93"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setMessage('');
                setMessageType('');
              }}
              secureTextEntry={true}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleResendVerification}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Resend Verification Email</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, isCheckingStatus && styles.disabledButton]}
            onPress={handleCheckVerificationStatus}
            disabled={isCheckingStatus}
          >
            {isCheckingStatus ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#000" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>Check Verification Status</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Didn't receive the email?</Text>
            <Text style={styles.helpText}>
              • Check your spam/junk folder{'\n'}
              • Make sure you entered the correct email address{'\n'}
              • Wait a few minutes and try resending
            </Text>
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  backButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  successMessage: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
  },
  successText: {
    color: '#2e7d32',
  },
});
