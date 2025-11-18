import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Helper function to send Expo Push notification to user
 */
async function sendExpoPushNotification(
  userId: string,
  title: string,
  body: string,
  data: { [key: string]: string }
): Promise<void> {
  try {
    // Get all Expo Push Tokens for the user
    const tokensRef = db.collection('users').doc(userId).collection('expoPushTokens');
    const tokensSnapshot = await tokensRef.get();

    if (tokensSnapshot.empty) {
      console.log(`No Expo Push Tokens found for user ${userId}`);
      return;
    }

    const pushTokens: string[] = [];

    tokensSnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.token) {
        pushTokens.push(tokenData.token);
      }
    });

    if (pushTokens.length === 0) {
      console.log(`No valid Expo Push Tokens for user ${userId}`);
      return;
    }

    // Prepare messages for Expo Push API
    const messages = pushTokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data,
    }));

    // Send to Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo Push API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Expo Push API response for user ${userId}:`, result);

    // Handle errors from Expo Push API
    if (Array.isArray(result.data)) {
      result.data.forEach((receipt: any, index: number) => {
        if (receipt.status === 'error') {
          console.error(`❌ Error sending to token ${pushTokens[index].substring(0, 30)}...:`, receipt.message);
          
          // Remove invalid tokens (DeviceNotRegistered, InvalidCredentials, etc.)
          if (receipt.details?.error === 'DeviceNotRegistered' || 
              receipt.details?.error === 'InvalidCredentials') {
            const invalidToken = pushTokens[index];
            tokensRef.doc(invalidToken).delete().catch((err) => {
              console.error(`Error removing invalid token:`, err);
            });
            console.log(`🗑️ Removed invalid token: ${invalidToken.substring(0, 30)}...`);
          }
        }
      });
    }
  } catch (error) {
    console.error(`❌ Error sending Expo Push notification to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Cloud Function triggered when order status changes
 */
export const onOrderStatusUpdate = functions.firestore
  .document('orders/{orderId}')
  .onWrite(async (
    change: functions.Change<functions.firestore.DocumentSnapshot>,
    context: functions.EventContext
  ) => {
    const orderId = context.params.orderId as string;
    const beforeData = change.before.exists ? change.before.data() : undefined;
    const afterData = change.after.exists ? change.after.data() : undefined;

    if (!afterData) {
      console.log(`Order ${orderId} deleted. Skipping notification.`);
      return null;
    }

    // Extract status from multiple possible fields and normalize
    const extractStatus = (data: any) => {
      const raw = data?.status ?? data?.order_status ?? data?.state ?? data?.orderState;
      return raw ? String(raw) : undefined;
    };

    const beforeStatusRaw = beforeData ? extractStatus(beforeData) : undefined;
    const afterStatusRaw = extractStatus(afterData);

    // Normalize to canonical keys
    const normalize = (s?: string) => (s ? s.toString().trim().toLowerCase() : undefined);
    const beforeNorm = normalize(beforeStatusRaw);
    const afterNorm = normalize(afterStatusRaw);

    // Only send if status actually changed (or created with a defined status)
    if (beforeNorm === afterNorm) {
      console.log(`Order ${orderId} status unchanged (${afterStatusRaw ?? 'undefined'}), skipping notification`);
      return null;
    }

    // Resolve userId from multiple possible fields
    const userId = afterData.user_id || afterData.userId || afterData.uid || afterData.customer_id;
    if (!userId) {
      console.log(`No user_id found for order ${orderId}`);
      return null;
    }

    // Map of normalized statuses to messages
    const statusMessages: { [key: string]: { title: string; body: string } } = {
      preparing: {
        title: 'Order Update',
        body: `Your order #${orderId.substring(0, 8)} is now being prepared.`,
      },
      processing: {
        title: 'Order Update',
        body: `Your order #${orderId.substring(0, 8)} is now being processed.`,
      },
      shipped: {
        title: 'Order Shipped!',
        body: `Your order #${orderId.substring(0, 8)} has been shipped and is on its way!`,
      },
      completed: {
        title: 'Order Completed!',
        body: `Your order #${orderId.substring(0, 8)} has been completed. Thank you for your purchase!`,
      },
      cancelled: {
        title: 'Order Cancelled',
        body: `Your order #${orderId.substring(0, 8)} has been cancelled.`,
      },
      canceled: {
        title: 'Order Cancelled',
        body: `Your order #${orderId.substring(0, 8)} has been cancelled.`,
      },
    };

    const message = afterNorm ? statusMessages[afterNorm] : undefined;
    if (!message) {
      console.log(`Unknown order status value: ${afterStatusRaw}. Known: ${Object.keys(statusMessages).join(', ')}`);
      return null;
    }

    try {
      await sendExpoPushNotification(userId, message.title, message.body, {
        type: 'order',
        orderId: orderId,
        status: String(afterStatusRaw),
      });

      console.log(`✅ Order status notification sent for order ${orderId} (${beforeStatusRaw ?? 'new'} → ${afterStatusRaw})`);
      return null;
    } catch (error) {
      console.error(`❌ Error sending order status notification:`, error);
      return null;
    }
  });

/**
 * Cloud Function triggered when KYC status changes
 */
export const onKYCStatusUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (
    change: functions.Change<functions.firestore.DocumentSnapshot>,
    context: functions.EventContext
  ) => {
    const userId = context.params.userId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    const beforeKYC = beforeData.kyc;
    const afterKYC = afterData.kyc;

    // Check if KYC data exists and status changed
    if (!afterKYC || !afterKYC.status) {
      return null;
    }

    const normalizeStatus = (status: any) =>
      typeof status === 'string' ? status.toString().trim().toLowerCase() : undefined;

    const beforeStatus = normalizeStatus(beforeKYC?.status);
    const afterStatus = normalizeStatus(afterKYC.status);

    // Only send notification if status actually changed (case-insensitive)
    if (beforeStatus === afterStatus) {
      console.log(`KYC status unchanged for user ${userId} (${afterStatus}), skipping notification`);
      return null;
    }

    // Only send notifications for verified or rejected status (case-insensitive)
    if (afterStatus !== 'verified' && afterStatus !== 'rejected') {
      return null;
    }

    let title: string;
    let body: string;
    const data: { [key: string]: string } = {
      type: 'kyc',
      status: afterStatus || '',
    };

    if (afterStatus === 'verified') {
      title = 'KYC Verification Update';
      body = 'Your KYC verification has been approved! You can now proceed with your orders.';
    } else if (afterStatus === 'rejected') {
      title = 'KYC Verification Update';
      const reason = afterKYC.rejectionReason || 'Please check your submitted documents.';
      body = `Your KYC verification has been rejected. ${reason}`;
      data.reason = reason;
    } else {
      return null;
    }

    try {
      await sendExpoPushNotification(userId, title, body, data);

      console.log(`✅ KYC status notification sent for user ${userId} (${beforeStatus} → ${afterStatus})`);
      return null;
    } catch (error) {
      console.error(`❌ Error sending KYC status notification:`, error);
      return null;
    }
  });
