import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { Linking, Platform } from 'react-native';
import { db } from '../constants/firebaseConfig';

// Conditionally import expo-notifications (only available in development builds)
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log(' expo-notifications not available - running in Expo Go. Push notifications require a development build.');
}

// Conditionally import expo-device (only available in development builds)
let Device: typeof import('expo-device') | null = null;
try {
  Device = require('expo-device');
} catch (e) {
  console.log(' expo-device not available - running in Expo Go or native module not linked');
}

const EXPO_PUSH_TOKENS_COLLECTION = 'expoPushTokens';
const NOTIFICATIONS_ENABLED_KEY_PREFIX = 'notifications_enabled_';

const notificationsPreferenceCache: Record<string, boolean | undefined> = {};

export const setNotificationsEnabledCache = (userId: string, enabled: boolean) => {
  notificationsPreferenceCache[userId] = enabled;
};

export const getNotificationsEnabled = async (userId: string): Promise<boolean> => {
  if (notificationsPreferenceCache[userId] !== undefined) {
    return notificationsPreferenceCache[userId] as boolean;
  }

  try {
    const key = `${NOTIFICATIONS_ENABLED_KEY_PREFIX}${userId}`;
    const stored = await AsyncStorage.getItem(key);
    const enabled = stored !== 'false';
    notificationsPreferenceCache[userId] = enabled;
    return enabled;
  } catch (error) {
    return true;
  }
};

// Configure how notifications are handled when app is in foreground (only if available)
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface NotificationData {
  type: 'order' | 'kyc';
  orderId?: string;
  status?: string;
  reason?: string;
}

/**
 * Request notification permissions
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!Notifications) {
      console.log(' expo-notifications not available - running in Expo Go. Push notifications require a development build.');
      return false;
    }

    // Check if running on physical device (only in development builds)
    if (Device && !Device.isDevice) {
      console.log(' Must use physical device for Push Notifications');
      return false;
    }
    
    // If Device module not available, assume we're on a device (for Expo Go compatibility)
    if (!Device) {
      console.log(' Device check unavailable - assuming physical device');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log(' Notification permission denied');
      return false;
    }

    console.log(' Notification permission granted');
    return true;
  } catch (error) {
    console.error(' Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get Expo Push Token
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    if (!Notifications) {
      console.log(' expo-notifications not available - running in Expo Go. Push notifications require a development build.');
      return null;
    }

    // Check if running on physical device (only in development builds)
    if (Device && !Device.isDevice) {
      console.log(' Must use physical device for Push Notifications');
      return null;
    }
    
    // If Device module not available, proceed anyway (for Expo Go compatibility)
    if (!Device) {
      console.log(' Device check unavailable - proceeding anyway');
    }

    const projectId =
      // Preferred in managed apps
      (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
      // Fallback for certain environments
      (Constants as any)?.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined as any
    );

    const token = tokenData.data;
    console.log(' Expo Push Token retrieved:', token.substring(0, 30) + '...');
    return token;
  } catch (error) {
    console.error(' Error getting Expo Push Token:', error);
    return null;
  }
};

/**
 * Store Expo Push Token in Firestore
 */
export const storeExpoPushToken = async (userId: string, token: string): Promise<void> => {
  try {
    // Use token as document ID (Expo Push Tokens are unique)
    const tokenDoc = doc(db, 'users', userId, EXPO_PUSH_TOKENS_COLLECTION, token);
    await setDoc(tokenDoc, {
      token,
      platform: Platform.OS,
      deviceId: Device?.modelName || 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Expo Push Token stored in Firestore');
  } catch (error) {
    console.error('❌ Error storing Expo Push Token:', error);
    throw error;
  }
};

/**
 * Remove Expo Push Token from Firestore
 */
export const removeExpoPushToken = async (userId: string, token: string): Promise<void> => {
  try {
    const tokenDoc = doc(db, 'users', userId, EXPO_PUSH_TOKENS_COLLECTION, token);
    await deleteDoc(tokenDoc);
    console.log('✅ Expo Push Token removed from Firestore');
  } catch (error) {
    console.error('❌ Error removing Expo Push Token:', error);
  }
};

/**
 * Get all Expo Push Tokens for a user
 */
export const getUserExpoPushTokens = async (userId: string): Promise<string[]> => {
  try {
    const tokensRef = collection(db, 'users', userId, EXPO_PUSH_TOKENS_COLLECTION);
    const tokensSnapshot = await getDocs(tokensRef);
    const tokens: string[] = [];
    tokensSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });
    return tokens;
  } catch (error) {
    console.error('❌ Error getting user Expo Push Tokens:', error);
    return [];
  }
};

/**
 * Initialize Expo Notifications and register token
 */
export const initializeNotifications = async (userId: string): Promise<void> => {
  try {
    const enabled = await getNotificationsEnabled(userId);
    if (!enabled) {
      console.log(' Notifications disabled for user, skipping initializeNotifications');
      return;
    }
    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('⚠️ Notification permission not granted');
      return;
    }

    // Get token
    const token = await getExpoPushToken();
    if (!token) {
      console.log('⚠️ Failed to get Expo Push Token');
      return;
    }

    // Store token
    await storeExpoPushToken(userId, token);

    // Note: Expo Push Tokens don't change frequently, but we can check periodically
    // The token will be refreshed automatically if it changes
  } catch (error) {
    console.error('❌ Error initializing notifications:', error);
  }
};

/**
 * Start listening to user's orders and show a local notification when status changes.
 */
export const startOrderStatusListener = (userId: string) => {
  if (!userId) return { unsubscribe: () => {} };
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('user_id', '==', userId));

  const prevStatus: Record<string, string | undefined> = {};

  const unsub1 = onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      const data: any = change.doc.data();
      const id = change.doc.id;
      const status = data?.status || data?.order_status || data?.state || data?.orderState;
      const before = prevStatus[id];
      prevStatus[id] = status;

      const items = Array.isArray(data?.items) ? data.items : [];
      const firstItemName = items.length > 0 ? items[0]?.name : undefined;
      const shortOrderId = id.substring(0, 8).toUpperCase();
      const productLabel = firstItemName || `order #${shortOrderId}`;

      if (change.type !== 'modified') return;
      if (!status || before === status) return;

      if (!Notifications) return;
      getNotificationsEnabled(userId)
        .then((enabled) => {
          if (!enabled) return;
          Notifications?.scheduleNotificationAsync({
            content: {
              title: 'Order Update',
              body: `${productLabel} is now ${String(status)}.`,
              data: { type: 'order', orderId: id, status: String(status) } as any,
            },
            trigger: null,
          }).catch(() => {});
        })
        .catch(() => {});
    });
  });

  const q2 = query(ordersRef, where('userId', '==', userId));
  const unsub2 = onSnapshot(q2, (snap) => {
    snap.docChanges().forEach((change) => {
      const data: any = change.doc.data();
      const id = change.doc.id;
      const status = data?.status || data?.order_status || data?.state || data?.orderState;
      const before = prevStatus[id];
      prevStatus[id] = status;

      if (change.type !== 'modified') return;
      if (!status || before === status) return;

      if (!Notifications) return;
      getNotificationsEnabled(userId)
        .then((enabled) => {
          if (!enabled) return;
          Notifications?.scheduleNotificationAsync({
            content: {
              title: 'Order Update',
              body: `Your order #${id.substring(0, 8)} is now ${String(status)}.`,
              data: { type: 'order', orderId: id, status: String(status) } as any,
            },
            trigger: null,
          }).catch(() => {});
        })
        .catch(() => {});
    });
  });

  return {
    unsubscribe: () => {
      try { unsub1(); } catch {}
      try { unsub2(); } catch {}
    }
  };
};

/**
 * Set up notification received handler (foreground)
 */
export const setupNotificationReceivedHandler = (onNotificationTap?: (data: NotificationData) => void) => {
  if (!Notifications) {
    console.log('⚠️ expo-notifications not available - returning dummy subscription');
    return { remove: () => {} };
  }

  return Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received:', notification);
    
    const data = notification.request.content.data as unknown as NotificationData;
    
    // Call callback if provided
    if (onNotificationTap && data) {
      onNotificationTap(data);
    }
  });
};

/**
 * Set up notification response handler (when user taps notification)
 */
export const setupNotificationResponseHandler = (onNotificationTap?: (data: NotificationData) => void) => {
  if (!Notifications) {
    console.log('⚠️ expo-notifications not available - returning dummy subscription');
    return { remove: () => {} };
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('🔔 Notification tapped:', response);
    
    const data = response.notification.request.content.data as unknown as NotificationData;
    
    if (onNotificationTap && data) {
      onNotificationTap(data);
    }
  });
};

/**
 * Handle notification tap and navigate
 * @param data - Notification data
 * @param router - Expo router instance (from useRouter hook)
 */
export const handleNotificationTap = (data: NotificationData, router?: any) => {
  console.log('🔔 Notification tapped:', data);

  if (data.type === 'order' && data.orderId) {
    // Navigate to orders list screen
    if (router) {
      router.push('/orders');
    } else {
      // Fallback: use Linking to open deep link
      Linking.openURL('smoquebrosapp://orders');
    }
  } else if (data.type === 'kyc') {
    // Navigate to KYC screen
    if (router) {
      router.push('/kyc');
    } else {
      Linking.openURL('smoquebrosapp://kyc');
    }
  }
};

/**
 * Clean up Expo Push Tokens on logout
 */
export const cleanupExpoPushTokens = async (userId: string): Promise<void> => {
  try {
    const tokens = await getUserExpoPushTokens(userId);
    for (const token of tokens) {
      await removeExpoPushToken(userId, token);
    }
    console.log('✅ Expo Push Tokens cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up Expo Push Tokens:', error);
  }
};

/**
 * Clear all delivered notifications and reset badge count.
 * Call this when the app is opened so old push notifications disappear.
 */
export const clearAllNotifications = async (): Promise<void> => {
  if (!Notifications) return;
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
  }
};

