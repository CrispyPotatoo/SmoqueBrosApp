# Push Notifications Setup Checklist

Use this checklist to verify your push notification setup is complete.

## ✅ Configuration Files

- [x] `google-services.json` in project root
- [x] `app.json` configured with `expo-notifications` plugin
- [x] `app.json` has `googleServicesFile` reference for Android
- [x] `eas.json` has development and production profiles
- [x] EAS project ID configured: `e14ea7c2-c9e5-453e-b06b-25c7a26a694e`

## 🔑 FCM Credentials Setup

### Step 1: Get FCM Server Key from Firebase

**If Legacy API is disabled, use Service Account method:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `smoquebros-4badf`
3. Go to **Project Settings** (gear icon) → **Service Accounts** tab
4. Click **Generate new private key**
5. Download the JSON file (keep it secure - this is your service account key)
6. The `project_id` in this file is your Firebase project ID
7. You'll need the **Sender ID** from Firebase Console → Project Settings → Cloud Messaging (it's shown there)

**Alternative: Enable Legacy API (if possible)**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: `smoquebros-4badf`
3. Go to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API (Legacy)"
5. Click on it and **Enable** if disabled
6. Go back to Firebase Console → Project Settings → Cloud Messaging
7. Under "Cloud Messaging API (Legacy)", find **Server key**
8. Copy the server key

### Step 2: Upload FCM Server Key to Expo

Run these commands:

```bash
# 1. Make sure you're logged in to Expo
eas login

# 2. Verify your project is linked
eas project:info

# 3. Configure credentials for Android
eas credentials

# When prompted:
# - Select: Android
# - Choose: Push Notifications
# - Select: Set up Push Notifications
# - Enter your FCM Server Key when prompted
```

**Alternative:** Check if credentials are already set:
```bash
eas credentials
# Select Android → Push Notifications
# If you see "FCM Server Key: [configured]", you're good!
```

## 🏗️ Build Configuration

### Development Build
Your `eas.json` is configured correctly:
```json
{
  "development": {
    "developmentClient": true,
    "distribution": "internal"
  }
}
```

### To Build Development Build:
```bash
eas build --profile development --platform android
```

## ☁️ Cloud Functions Setup

### Verify Cloud Functions are Deployed:

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Check if Functions are Deployed:
```bash
firebase functions:list
```

You should see:
- `onOrderStatusUpdate`
- `onKYCStatusUpdate`

## 🧪 Testing Checklist

### 1. Install Development Build
- [ ] Download APK from EAS build page
- [ ] Install on Android device
- [ ] Open app and log in

### 2. Verify Token Registration
- [ ] Log in to the app
- [ ] Check Firestore: `users/{userId}/expoPushTokens/`
- [ ] Should see a document with Expo Push Token (starts with `ExponentPushToken[...]`)

### 3. Test Notification Manually
- [ ] Go to [Expo Push Notification Tool](https://expo.dev/notifications)
- [ ] Enter your Expo Push Token from Firestore
- [ ] Send a test notification
- [ ] Should receive notification on device

### 4. Test Order Notification
- [ ] Create an order in the app
- [ ] Update order status in Firestore:
  ```javascript
  // In Firebase Console or via admin SDK
  await db.collection('orders').doc('ORDER_ID').update({
    status: 'Shipped'
  });
  ```
- [ ] Should receive notification within a few seconds

### 5. Test KYC Notification
- [ ] Submit KYC documents in the app
- [ ] Update KYC status in Firestore:
  ```javascript
  await db.collection('users').doc('USER_ID').update({
    'kyc.status': 'verified',
    'kyc.verifiedAt': new Date()
  });
  ```
- [ ] Should receive notification

## 🔍 Troubleshooting Commands

### Check EAS Project Status:
```bash
eas project:info
```

### View Build History:
```bash
eas build:list
```

### Check Function Logs:
```bash
firebase functions:log
```

### Check if FCM Credentials are Set:
```bash
eas credentials
# Select Android → Push Notifications
```

## 📝 Quick Verification Commands

Run these to verify everything is set up:

```bash
# 1. Check if logged in to Expo
eas whoami

# 2. Check project info
eas project:info

# 3. Check Firebase project
firebase projects:list

# 4. Check if functions are deployed
firebase functions:list

# 5. View recent function logs
firebase functions:log --limit 10
```

## ⚠️ Common Issues

### Issue: "Cannot find native module 'ExpoDevice'"
**Solution:** You're running in Expo Go. Build a development build instead.

### Issue: "No FCM Server Key configured"
**Solution:** Run `eas credentials` and set up push notifications for Android.

### Issue: "Functions not triggering"
**Solution:** 
- Check if functions are deployed: `firebase functions:list`
- Check function logs: `firebase functions:log`
- Verify Firebase Blaze plan is active

### Issue: "No notifications received"
**Solution:**
- Verify Expo Push Token is in Firestore
- Check function logs for errors
- Verify device notification permissions are granted
- Test with Expo Push Notification Tool first

## ✅ Ready to Build?

Once you've completed the checklist above, you're ready to build:

```bash
eas build --profile development --platform android
```

After the build completes, install the APK and test notifications!

