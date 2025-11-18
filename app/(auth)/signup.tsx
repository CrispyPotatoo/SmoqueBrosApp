import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
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
} from 'react-native';

import { useAppDialog } from '../../components/AppDialogProvider';
import { useSession } from '../../context/SessionProvider';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useSession();
  const { showDialog } = useAppDialog();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [birthdate, setBirthdate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let strength = 0;

    if (pwd.length < 8) {
      errors.push('At least 8 characters');
    } else {
      strength += 1;
    }

    if (!/[A-Z]/.test(pwd)) {
      errors.push('One uppercase letter');
    } else {
      strength += 1;
    }

    if (!/[a-z]/.test(pwd)) {
      errors.push('One lowercase letter');
    } else {
      strength += 1;
    }

    if (!/\d/.test(pwd)) {
      errors.push('One number');
    } else {
      strength += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      errors.push('One special character');
    } else {
      strength += 1;
    }

    // Check if password contains username
    if (username.trim().length >= 3) {
      const usernameLower = username.toLowerCase();
      const passwordLower = pwd.toLowerCase();
      if (passwordLower.includes(usernameLower)) {
        warnings.push('Password should not contain your username');
      }
    }

    // Check if password contains birthdate parts
    if (birthdate.length === 10) {
      const [month, day, year] = birthdate.split('/');
      const monthPadded = month.padStart(2, '0');
      const dayPadded = day.padStart(2, '0');
      const yearStr = year;
      
      // Check for various date formats in password
      const datePatterns = [
        yearStr,                    // YYYY
        monthPadded + dayPadded,    // MMDD
        dayPadded + monthPadded,    // DDMM
        yearStr + monthPadded + dayPadded, // YYYYMMDD
        monthPadded + dayPadded + yearStr, // MMDDYYYY
        dayPadded + monthPadded + yearStr, // DDMMYYYY
        month,                      // M
        monthPadded,                // MM
        day,                        // D
        dayPadded,                  // DD
      ];
      
      const passwordLower = pwd.toLowerCase();
      for (const pattern of datePatterns) {
        if (pattern.length >= 2 && passwordLower.includes(pattern.toLowerCase())) {
          warnings.push('Password should not contain your birthdate');
          break; // Only show warning once
        }
      }
    }

    setPasswordStrength(strength);
    setPasswordErrors([...errors, ...warnings]);
  };

  const formatBirthdate = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 8 digits (MMDDYYYY)
    const limited = cleaned.substring(0, 8);
    
    // Format as MM/DD/YYYY progressively
    if (limited.length >= 5) {
      // MM/DD/YYYY format
      const month = limited.substring(0, 2);
      const day = limited.substring(2, 4);
      const year = limited.substring(4);
      return `${month}/${day}/${year}`;
    } else if (limited.length >= 3) {
      // MM/DD format
      const month = limited.substring(0, 2);
      const day = limited.substring(2);
      return `${month}/${day}`;
    } else if (limited.length >= 1) {
      // Just numbers, no formatting yet
      return limited;
    }
    return '';
  };

  const validateAge = (dateString: string) => {
    if (!dateString || dateString.length !== 10) return false;
    
    const [month, day, year] = dateString.split('/').map(Number);
    if (!month || !day || !year || month > 12 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
      return false;
    }
    
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const convertToFirebaseFormat = (dateString: string) => {
    if (!dateString || dateString.length !== 10) return '';
    const [month, day, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const onSignUpPress = async () => {
    if (isLoading) return;

    if (password !== confirmPassword) {
      showDialog({ title: 'Error', message: 'Passwords do not match.' });
      return;
    }
    if (!username.trim() || !email.trim() || !password.trim() || !birthdate.trim()) {
      showDialog({ title: 'Error', message: 'Please fill in all fields.' });
      return;
    }
    if (passwordStrength < 4) {
      showDialog({ title: 'Error', message: 'Please create a stronger password.' });
      return;
    }
    if (passwordErrors.length > 0) {
      // Check if there are warnings (username/birthdate in password)
      const hasWarnings = passwordErrors.some(err => 
        err.includes('username') || err.includes('birthdate')
      );
      if (hasWarnings) {
        showDialog({
          title: 'Password Security Warning',
          message:
            passwordErrors
              .filter(err => err.includes('username') || err.includes('birthdate'))
              .join('\n') +
            '\n\nFor better security, please choose a password that does not contain your username or birthdate.',
        });
        return;
      }
    }
    if (!validateAge(birthdate)) {
      showDialog({
        title: 'Age Restriction',
        message: 'You must be 18 years or older to create an account.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Add account_type: 0 for user accounts
      const firebaseBirthdate = convertToFirebaseFormat(birthdate);
      await signUp(email, password, username, firebaseBirthdate, 0);
      
      // Account created successfully - verification email is sent automatically
      showDialog({
        title: 'Account Created!',
        message:
          'Please check your email to verify your email (probably at spam folder).',
        confirmText: 'OK',
        onConfirm: () => router.replace('/(auth)'),
      });
    } catch (error: any) {
      // Show specific error messages
      if (error.message?.includes('Email address is already registered') || 
          error.message?.includes('email-already-in-use') || 
          error.code === 'auth/email-already-in-use') {
        showDialog({
          title: 'Email Already Registered',
          message: 'This email is already registered. Please use a different email or sign in.',
        });
      } else if (error.message?.includes('Username is already taken')) {
        showDialog({
          title: 'Username Taken',
          message: 'This username is already taken. Please choose a different username.',
        });
      } else if (error.message?.includes('Password is too weak')) {
        showDialog({
          title: 'Weak Password',
          message: 'Password is too weak. Please choose a stronger password.',
        });
      } else if (error.message?.includes('invalid-email')) {
        showDialog({
          title: 'Invalid Email',
          message: 'Please enter a valid email address.',
        });
      } else {
        // Generic error message for other errors
        showDialog({
          title: 'Registration Failed',
          message:
            error.message || 'Unable to create account. Please check your information and try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Feather name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
        <Image source={require('../../assets/images/Smoque_Bros_Logo.png')} style={styles.logo} />
        <Text style={styles.title}>Create your account</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#8e8e93"
            autoCapitalize="none"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              // Re-validate password if it's already entered
              if (password.length > 0) {
                validatePassword(password);
              }
            }}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#8e8e93"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Feather name="calendar" size={20} color="#8e8e93" style={styles.birthdateIcon} />
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY (Must be 18+)"
            placeholderTextColor="#8e8e93"
            value={birthdate}
            onChangeText={(text) => {
              const formatted = formatBirthdate(text);
              setBirthdate(formatted);
              // Re-validate password if it's already entered
              if (password.length > 0) {
                validatePassword(password);
              }
            }}
            keyboardType="numeric"
            maxLength={10}
          />
          {birthdate.length === 10 && (
            <Feather 
              name={validateAge(birthdate) ? "check-circle" : "x-circle"} 
              size={20} 
              color={validateAge(birthdate) ? "#5cb85c" : "#d9534f"} 
              style={styles.validationIcon}
            />
          )}
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
              validatePassword(text);
            }}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={22} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        {/* Password Strength Indicator */}
        {password.length > 0 && (
          <View style={styles.passwordStrengthContainer}>
            <View style={styles.strengthBarContainer}>
              <View style={[
                styles.strengthBar,
                {
                  width: `${(passwordStrength / 5) * 100}%`,
                  backgroundColor: 
                    passwordStrength <= 2 ? '#d9534f' :
                    passwordStrength <= 3 ? '#f0ad4e' :
                    passwordStrength <= 4 ? '#5cb85c' : '#5bc0de'
                }
              ]} />
            </View>
            <Text style={styles.strengthText}>
              {passwordStrength <= 2 ? 'Weak' :
               passwordStrength <= 3 ? 'Fair' :
               passwordStrength <= 4 ? 'Good' : 'Strong'}
            </Text>
          </View>
        )}

        {/* Password Requirements */}
        {passwordErrors.length > 0 && (
          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password must have:</Text>
            {passwordErrors.map((error, index) => (
              <Text key={index} style={styles.requirementText}>• {error}</Text>
            ))}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#8e8e93"
            secureTextEntry={!isConfirmPasswordVisible}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
          >
            <Feather name={isConfirmPasswordVisible ? 'eye' : 'eye-off'} size={22} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signUpButton, isLoading && styles.disabledButton]}
          onPress={onSignUpPress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpButtonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={() => router.back()}>
          <Text style={styles.loginButtonText}>Already have an account? Sign in</Text>
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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'flex-start',
    paddingTop: 60,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
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
    paddingRight: 16,
  },
  signUpButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#555',
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
    width: '100%',
  },
  strengthBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 12,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  passwordRequirements: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    width: '100%',
  },
  requirementsTitle: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  requirementText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 2,
  },
  birthdateIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  validationIcon: {
    marginRight: 16,
  },
});
