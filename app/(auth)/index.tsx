import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

import { useSession } from '../../context/SessionProvider';
import { sendVerificationEmailByCredentials } from '../../services/auth';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);

  const onSignInPress = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.message?.includes('Please verify your email address')) {
        // Show email verification error inline like web version
        setError('Please verify your email address before logging in.');
        setShowResendLink(true);
      } else {
        setError(error.message || 'Invalid Email or Password please try again!');
        setShowResendLink(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmailByCredentials(email, password);
      setError('Verification email sent! Please check your inbox.');
      setShowResendLink(false);
    } catch (emailError: any) {
      setError(emailError.message || 'Failed to send verification email. Please try again later.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginLeft: 10 }}>
              <Feather name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
        <Image source={require('../../assets/images/Smoque_Bros_Logo.png')} style={styles.logo} />
        <Text style={styles.title}>Sign in to continue</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#8e8e93"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
              setShowResendLink(false);
            }}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8e8e93"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
              setShowResendLink(false);
            }}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={22} color="#8e8e93" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.signInButton, isLoading && styles.disabledButton]}
          onPress={onSignInPress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signInButtonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.forgotPasswordButton} 
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {showResendLink && (
          <TouchableOpacity style={styles.resendButton} onPress={handleResendVerification}>
            <Text style={styles.resendButtonText}>Resend verification email</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.registerButtonText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.verifyButton} onPress={() => router.push('/(auth)/verify-email')}>
          <Text style={styles.verifyButtonText}>Need to verify your email?</Text>
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#d9534f',
    marginTop: 10,
    textAlign: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  eyeIcon: {
    padding: 12,
  },
  signInButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  registerButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerLink: {
    color: '#000080',
    fontWeight: 'bold',
  },
  verifyButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  resendButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
