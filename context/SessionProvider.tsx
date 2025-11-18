import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth } from '../constants/firebaseConfig';
import {
    User,
    getCurrentUser,
    loginUser,
    logoutUser,
    onAuthStateChange,
    signUpUser,
    updateUsername as updateUsernameService,
} from '../services/auth';

interface SessionContextType {
  session: User | null;
  isLoading: boolean;
  signOut: () => void;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, username: string, birthdate: string, accountType?: number) => Promise<User>;
  reloadSession: () => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}



export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const reloadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const updatedUser = await getCurrentUser();
      setSession(updatedUser);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);



  useEffect(() => {
    // Check current Firebase Auth state immediately on app startup
    console.log('🔍 Checking current Firebase Auth state...');
    console.log('Firebase Auth currentUser:', auth.currentUser ? `UID: ${auth.currentUser.uid}, Email: ${auth.currentUser.email}` : 'No Firebase Auth user');
    
    // If there's already a Firebase user, try to get their data immediately
    const initializeSession = async () => {
      if (auth.currentUser) {
        console.log('🚀 Found existing Firebase user, fetching user data...');
        try {
          const userData = await getCurrentUser();
          if (userData) {
            console.log('✅ Successfully restored user session:', userData.email);
            setSession(userData);
          }
        } catch (error) {
          console.error('❌ Failed to restore user session:', error);
        }
      }
      setIsLoading(false);
    };
    
    // Initialize session immediately
    initializeSession();
    
    // Set up auth state listener for future changes
    const unsubscribe = onAuthStateChange((user) => {
      console.log('📱 SessionProvider - Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setSession(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProtectedRoute = segments.includes('checkout') || segments.includes('you') || segments.includes('address');

    console.log('Navigation check:', {
      hasSession: !!session,
      userEmail: session?.email,
      isAgeVerified: session?.isAgeVerified,
      currentSegment: segments[0],
      inAuthGroup,
      inProtectedRoute
    });

    if (session && inAuthGroup) {
      // Add a small delay to prevent race conditions with auth errors
      // This allows login errors to be handled before navigation
      const timeoutId = setTimeout(() => {
        // Check current Firebase Auth state to ensure user is still signed in
        const currentFirebaseUser = auth.currentUser;
        if (currentFirebaseUser && currentFirebaseUser.emailVerified) {
          console.log('Redirecting to main app - user verified');
          router.replace('/(tabs)');
        } else if (currentFirebaseUser && !currentFirebaseUser.emailVerified) {
          console.log('User not verified, staying on auth screen');
          // Don't redirect, let them stay on auth screen
        } else {
          console.log('No current user, staying on auth screen');
          // No current user, don't redirect
        }
      }, 100);
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(timeoutId);
    } else if (!session && inProtectedRoute) {
      // Only redirect to auth if user is trying to access protected routes
      console.log('Redirecting to auth screen - protected route accessed');
      router.replace('/(auth)');
    }
    // Allow all users (verified or not) to browse the homepage
    // Allow unauthenticated users to browse the homepage and other public routes
  }, [session, isLoading, segments, router]);

  const updateUsername = async (newUsername: string) => {
    if (!session?.uid) {
      throw new Error('No user logged in');
    }
    const updatedUser = await updateUsernameService(session.uid, newUsername);
    setSession(updatedUser);
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        isLoading,
        signOut: logoutUser,
        signIn: loginUser,
        signUp: signUpUser,
        reloadSession,
        updateUsername,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
