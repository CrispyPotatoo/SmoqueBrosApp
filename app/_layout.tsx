// app/_layout.tsx
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDialogProvider } from '../components/AppDialogProvider';
import '../constants/firebaseConfig';
import { CartProvider } from '../context/CartContext';
import { ProductProvider } from '../context/ProductProvider';
import { SessionProvider, useSession } from '../context/SessionProvider';
import {
  clearAllNotifications,
  handleNotificationTap,
  initializeNotifications,
  setupNotificationReceivedHandler,
  setupNotificationResponseHandler,
  startOrderStatusListener
} from '../services/notifications';

// Conditionally import expo-notifications
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Not available in Expo Go
}

function NotificationInitializer() {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.uid) {
      return;
    }

    let receivedSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;
    let orderListener: { unsubscribe: () => void } | null = null;

    // Initialize notifications when user is logged in. This function internally
    // checks the saved preference via getNotificationsEnabled, so it's safe to
    // call unconditionally here.
    initializeNotifications(session.uid).catch((error) => {
      console.error('Failed to initialize notifications:', error);
    });

    // Clear any delivered notifications and reset badge when the app is opened
    clearAllNotifications().catch((error) => {
      console.error('Failed to clear notifications:', error);
    });

    // Listen to order status changes for this user and show local notifications.
    // The listener itself checks getNotificationsEnabled before scheduling, so
    // it respects the Allow Notifications toggle at runtime.
    orderListener = startOrderStatusListener(session.uid);

    // Set up notification received handler (foreground)
    receivedSubscription = setupNotificationReceivedHandler((data) => {
      // Notification received while app is in foreground
      // The notification will be shown automatically based on our handler config
      // Intentionally do NOT navigate here; navigation should only occur when the
      // user taps the notification (handled in the response/tap handlers).
    });

    // Set up notification response handler (when user taps notification)
    responseSubscription = setupNotificationResponseHandler((data) => {
      handleNotificationTap(data, router);
    });

    // Handle notification that opened the app (when app was closed)
    if (Notifications) {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          console.log('📬 App opened from notification:', response);
          const data = response.notification.request.content.data as any;
          handleNotificationTap(data, router);
        }
      });
    }

    return () => {
      if (receivedSubscription) receivedSubscription.remove();
      if (responseSubscription) responseSubscription.remove();
      if (orderListener) orderListener.unsubscribe();
    };
  }, [session?.uid, router]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    clearAllNotifications().catch((error) => {
      console.error('Failed to clear notifications on app start:', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ProductProvider>
        <SessionProvider>
          <CartProvider>
            <AppDialogProvider>
              <NotificationInitializer />
              <Slot />
              <StatusBar style="dark" />
            </AppDialogProvider>
          </CartProvider>
        </SessionProvider>
      </ProductProvider>
    </SafeAreaProvider>
  );
}
