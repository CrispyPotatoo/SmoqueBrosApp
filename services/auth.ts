import {
    createUserWithEmailAndPassword,
    User as FirebaseUser,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../constants/firebaseConfig';

export interface User {
  uid: string;
  email: string;
  username: string;
  birthdate: string;
  account_type: number;
  isAgeVerified: boolean;
  createdAt: any;
  updatedAt: any;
  recipientName?: string;
  address?: string;
  emailVerified?: boolean;
}

/**
 * Check if email already exists in Firestore
 */
export const emailExists = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
};

/**
 * Check if username already exists in Firestore
 */
export const usernameExists = async (username: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username existence:', error);
    return false;
  }
};

/**
 * Registers a new user and creates a user document in Firestore.
 */
export const signUpUser = async (
  email: string,
  password: string,
  username: string,
  birthdate: string,
  accountType: number = 0
): Promise<User> => {
  try {
    // Check if email already exists
    const emailAlreadyExists = await emailExists(email);
    if (emailAlreadyExists) {
      throw new Error('Email address is already registered.');
    }

    // Check if username already exists
    const usernameAlreadyExists = await usernameExists(username);
    if (usernameAlreadyExists) {
      throw new Error('Username is already taken.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Send email verification immediately after account creation
    try {
      await sendEmailVerification(firebaseUser);
    } catch (verificationError) {
      console.error('Error sending verification email during signup:', verificationError);
    }

    // Create user document in Firestore
    const newUser: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      username: username.toLowerCase(),
      birthdate: birthdate,
      account_type: accountType,
      isAgeVerified: false,
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

    // Sign out the user immediately after registration to prevent auto-login
    await signOut(auth);

    return newUser;
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Provide specific error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email address is already registered.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please choose a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    } else {
      // Generic message so raw Firebase error details are not exposed to the user
      throw new Error('Registration failed. Please try again.');
    }
  }
};

/**
 * Logs in an existing user with email and password.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<AuthResponse>} A promise that resolves with the user data.
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get user data from Firestore first
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data() as User;

    // Check email verification status - match web implementation logic
    const isEmailVerifiedInFirebase = firebaseUser.emailVerified;
    const isEmailVerifiedInFirestore = userData.emailVerified === true;

    // Block login if email is not verified in Firebase Auth
    // This matches the web implementation which checks Firebase Auth first
    if (!isEmailVerifiedInFirebase) {
      // Sign out the user since they can't login without verification
      await signOut(auth);
      throw new Error('Please verify your email address before logging in. Check your inbox for a verification email.');
    }

    // If Firebase Auth says verified, update Firestore if needed
    if (isEmailVerifiedInFirebase && !isEmailVerifiedInFirestore) {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        emailVerified: true,
        updatedAt: serverTimestamp()
      });
      userData.emailVerified = true;
    }

    return userData;
  } catch (error: any) {
    // Provide specific error messages
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    } else {
      throw new Error(error.message || 'Login failed');
    }
  }
};

/**
 * Logs out the current user.
 * @returns {Promise<void>} A promise that resolves when the user is logged out.
 */
export const logoutUser = async (): Promise<void> => {
  try {
    const firebaseUser = auth.currentUser;
    
    // Clean up Expo Push Tokens before signing out
    if (firebaseUser) {
      try {
        const { cleanupExpoPushTokens } = await import('./notifications');
        await cleanupExpoPushTokens(firebaseUser.uid);
      } catch (notificationError) {
        console.error('Error cleaning up Expo Push Tokens:', notificationError);
        // Don't throw - continue with logout even if token cleanup fails
      }
    }
    
    await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error(error.message || 'Logout failed');
  }
};

/**
 * Gets the current user's data.
 * @returns {Promise<User | null>} A promise that resolves with the user data or null if no user is logged in.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) return null;

    return userDoc.data() as User;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Listens for changes to the user's authentication state.
 * @param {function} callback - A callback function that will be called with the user data or null if no user is logged in.
 * @returns {function} A function that can be used to unsubscribe from the listener.
 */
export const updateUserProfile = async (userId: string, data: { recipientName?: string; address?: string }) => {
  if (!userId) {
    throw new Error('User is not logged in.');
  }
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, data);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Could not update profile.');
  }
};

export const updateUsername = async (userId: string, newUsername: string): Promise<User> => {
  console.log('🔄 updateUsername called with userId:', userId);
  console.log('🔄 Current auth user:', auth.currentUser?.uid);
  
  if (!userId) {
    throw new Error('User is not logged in.');
  }

  if (!newUsername || !newUsername.trim()) {
    throw new Error('Username cannot be empty');
  }

  const normalizedUsername = newUsername.toLowerCase().trim();
  console.log('🔄 Normalized username:', normalizedUsername);

  try {
    // Check if username is already taken
    console.log('🔍 Checking for duplicate username...');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', normalizedUsername));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty && querySnapshot.docs[0].id !== userId) {
      console.log('❌ Username already taken by:', querySnapshot.docs[0].id);
      throw new Error('Username is already taken');
    }

    console.log('✅ Username available');
    console.log('📝 Updating user document:', userId);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      username: normalizedUsername,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Username updated successfully');
    console.log('📄 Fetching updated user data...');
    
    const updatedUserDoc = await getDoc(userRef);
    if (!updatedUserDoc.exists()) {
      throw new Error('User data not found');
    }

    console.log('✅ Updated user data retrieved');
    return updatedUserDoc.data() as User;
  } catch (error: any) {
    console.error('❌ Error updating username:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    throw error;
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    console.log('🔥 Firebase Auth State Changed:', firebaseUser ? `UID: ${firebaseUser.uid}, Email: ${firebaseUser.email}` : 'No Firebase user');
    
    if (firebaseUser) {
      // Function to fetch user document with retries
      const fetchUserDocument = async (retries = 3, delay = 500): Promise<User | null> => {
        for (let i = 0; i < retries; i++) {
          try {
            console.log(`📄 Fetching user document (attempt ${i + 1}) for UID: ${firebaseUser.uid}`);
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              console.log('✅ User document found:', userData.email);
              return userData;
            } else {
              console.log(`❌ User document not found (attempt ${i + 1})`);
            }
            
            // If doc doesn't exist, wait and retry
            await new Promise(res => setTimeout(res, delay));
          } catch (error) {
            console.error(`Auth state change error (attempt ${i + 1}):`, error);
            // If there's a permission error, it might be a race condition, so we retry
            await new Promise(res => setTimeout(res, delay));
          }
        }
        console.log('❌ Failed to fetch user document after all retries');
        return null;
      };

      const user = await fetchUserDocument();
      console.log('🎯 Final auth state result:', user ? `User: ${user.email}` : 'No user data');
      callback(user);

    } else {
      console.log('🚫 No Firebase user - calling callback with null');
      callback(null);
    }
  });
};

/**
 * Sends email verification to the current user
 * @returns {Promise<void>} A promise that resolves when the email is sent
 */
export const sendVerificationEmail = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    await sendEmailVerification(user);
    console.log('✅ Verification email sent to:', user.email);
  } catch (error: any) {
    console.error('❌ Error sending verification email:', error);
    throw new Error(error.message || 'Failed to send verification email');
  }
};

/**
 * Sends email verification by temporarily signing in the user
 * @param {string} email - The user's email address
 * @param {string} password - The user's password
 * @returns {Promise<void>} A promise that resolves when the email is sent
 */
export const sendVerificationEmailByCredentials = async (email: string, password: string): Promise<void> => {
  try {
    // Temporarily sign in the user to send verification email
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    if (firebaseUser.emailVerified) {
      await signOut(auth); // Sign out immediately
      throw new Error('Email is already verified');
    }

    // Send verification email
    await sendEmailVerification(firebaseUser);
    console.log('✅ Verification email sent to:', firebaseUser.email);

    // Sign out the user immediately after sending email
    await signOut(auth);
  } catch (error: any) {
    // Make sure to sign out even if there's an error
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('Error signing out after verification email attempt:', signOutError);
    }

    console.error('❌ Error sending verification email:', error);
    
    // Handle specific error cases
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password. Please check your credentials.');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please try again later.');
    } else {
      throw new Error(error.message || 'Failed to send verification email');
    }
  }
};

/**
 * Sends a password reset email to the specified email address
 * @param {string} email - The user's email address
 * @returns {Promise<void>} A promise that resolves when the email is sent
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    if (!email || !email.trim()) {
      throw new Error('Email address is required');
    }

    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent to:', email);
  } catch (error: any) {
    console.error('❌ Error sending password reset email:', error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else {
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }
};

/**
 * Checks if the current user's email is verified
 * @returns {boolean} True if email is verified, false otherwise
 */
export const isEmailVerified = (): boolean => {
  const user = auth.currentUser;
  return user ? user.emailVerified : false;
};

/**
 * Reloads the current user to get the latest email verification status
 * @returns {Promise<boolean>} A promise that resolves with the verification status
 */
export const checkEmailVerificationStatus = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return false;
    }
    
    await user.reload();
    return user.emailVerified;
  } catch (error) {
    console.error('❌ Error checking email verification status:', error);
    return false;
  }
};

// Legacy function names for backward compatibility
export const signUp = signUpUser;
export const signIn = loginUser;
