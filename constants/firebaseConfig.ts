import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { Auth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Suppress Firebase BloomFilter warnings (non-critical)
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('BloomFilter error')) {
    return; // Suppress BloomFilter warnings
  }
  originalWarn.apply(console, args);
};

const firebaseConfig = {
  apiKey: 'AIzaSyDbbhKlZgIMxEF_V9hYEwje-S5wDkZPsEM',
  authDomain: 'smoquebros-4badf.firebaseapp.com',
  projectId: 'smoquebros-4badf',
  storageBucket: 'smoquebros-4badf.appspot.com',
  messagingSenderId: '404318315259',
  appId: '1:404318315259:web:f14c55165dafca7da6065e',
  measurementId: 'G-QMGV111J4C',
};

const firebaseAuthAny = firebaseAuth as any;

const app = initializeApp(firebaseConfig);

// Initialize Auth - Firebase automatically handles persistence in React Native
const auth: Auth = initializeAuth(app, {
  persistence: firebaseAuthAny.getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize other Firebase services
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
