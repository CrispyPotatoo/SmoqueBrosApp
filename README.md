# SmoqueBros App

![React Native](https://img.shields.io/badge/React%20Native-0.79.5-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-53.0.20-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12.0.0-FFCA28?logo=firebase&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-2.76.1-3ECF8E?logo=supabase&logoColor=white)
![EAS](https://img.shields.io/badge/EAS%20Build-16.17.4-000020?logo=expo&logoColor=white)

---

## Project Overview

**SmoqueBros App** is a full-featured mobile e-commerce application built with React Native (Expo) for a BBQ/smoked food shop. The app allows customers to browse a product catalogue, manage a shopping cart, place orders with delivery or pickup, track order status in real time, and submit KYC (Know Your Customer) identity verification documents. Push notifications keep customers informed of order and KYC status updates automatically via Firebase Cloud Functions and the Expo Push API.

---

## Key Features

- **Product Catalogue** — Browse, filter by category (BBQ Platters, Sandwiches, Side Dishes, Sauces, Meats by the Pound, Drinks), and sort by price; real-time Firestore sync excludes archived products automatically.
- **Shopping Cart** — Add items with flavor variants, adjust quantities with stock validation, and persist cart to Firestore for cross-device consistency.
- **Order Management** — Place delivery or pickup orders with subtotal, shipping cost, and tax breakdowns; full order history with real-time status tracking.
- **Order Tracking** — Per-order detail view showing live status (Preparing → Processing → Shipped → Completed / Cancelled) with stock auto-restoration on cancellation.
- **KYC Verification** — In-app identity verification flow: capture selfie + ID front/back images, upload to Supabase Storage, and store metadata in Firestore.
- **Authentication** — Email/password registration with mandatory email verification; forgot password and resend-verification flows.
- **Address Book** — Full address CRUD with Philippine Standard Geographic Code (PSGC) API integration for province/city/barangay selection.
- **Product Reviews** — Star ratings and comments per product; average rating recalculated automatically after each submission.
- **Push Notifications** — Firebase Cloud Functions trigger Expo Push notifications for order status changes and KYC verification outcomes.
- **Profile Management** — Update username, manage profile picture (Supabase Storage), toggle notification preferences.
- **Contact Form** — In-app contact submission stored to Firestore.
- **Drawer Navigation** — Custom side drawer with quick links alongside bottom-tab navigation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.79.5 (Expo ~53) |
| **Language** | TypeScript 5.8.3 |
| **Routing** | Expo Router 5 (file-based) |
| **Auth & Database** | Firebase Auth + Cloud Firestore v12 |
| **File Storage** | Supabase Storage (KYC documents & profile pictures) |
| **Cloud Functions** | Firebase Functions (Node.js / TypeScript) |
| **Push Notifications** | Expo Notifications + Expo Push API via Firebase Functions |
| **State Management** | React Context API (SessionProvider, CartProvider, ProductProvider) |
| **Navigation** | React Navigation (Bottom Tabs + Drawer + Native Stack) |
| **Build & Distribution** | Expo Application Services (EAS) |
| **Animations** | React Native Reanimated 3, Expo Haptics |
| **Persistence** | AsyncStorage (auth session + notification preferences) |
| **Geographic Data** | Philippine Standard Geographic Code (PSGC) public API |
| **Linting** | ESLint with `eslint-config-expo` |
| **Bundler** | Metro (via Expo) |

---

## System Architecture

```
SmoqueBrosApp/
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx             # Root layout — providers, notification init
│   ├── index.tsx               # Entry redirect
│   ├── (auth)/                 # Public auth routes
│   │   ├── index.tsx           # Login screen
│   │   ├── signup.tsx          # Registration screen
│   │   ├── forgot-password.tsx # Password reset
│   │   └── verify-email.tsx    # Email verification screen
│   ├── (tabs)/                 # Authenticated bottom-tab routes
│   │   ├── index.tsx           # Shop (product listing)
│   │   ├── cart.tsx            # Shopping cart
│   │   └── you.tsx             # Profile & account settings
│   ├── product/[id].tsx        # Product detail + add to cart
│   ├── checkout.tsx            # Checkout flow
│   ├── payment.tsx             # Payment method selection
│   ├── order-success.tsx       # Post-order confirmation
│   ├── orders.tsx              # Order history list
│   ├── tracking/               # Order tracking detail
│   │   ├── index.tsx           # Tracking overview
│   │   └── [orderId].tsx       # Per-order tracking detail
│   ├── address/                # Address management
│   │   ├── index.tsx           # Address list
│   │   ├── add.tsx             # Add new address (PSGC API)
│   │   ├── select.tsx          # Select address at checkout
│   │   └── edit/               # Edit existing address
│   ├── kyc/index.tsx           # KYC identity verification flow
│   ├── reviews/                # Product reviews
│   ├── settings.tsx            # App settings
│   ├── contact.tsx             # Contact form
│   ├── search.tsx              # Product search
│   └── verify.tsx              # Verification status
│
├── components/                 # Reusable UI components
│   ├── ProductCard.tsx
│   ├── ImageCarousel.tsx
│   ├── AddressDropdown.tsx
│   ├── CustomDrawerContent.tsx
│   ├── CartIcon.tsx
│   ├── AppDialogProvider.tsx   # Global modal/dialog system
│   └── ui/                     # Primitive UI elements
│
├── context/                    # React Context providers
│   ├── SessionProvider.tsx     # Auth state, sign-in/up/out, routing guard
│   ├── CartProvider.tsx        # Cart item count & state
│   └── ProductProvider.tsx     # Product list with real-time Firestore sync
│
├── services/                   # Business logic / Firestore access layer
│   ├── auth.ts                 # Firebase Auth operations
│   ├── products.ts             # Product CRUD + real-time subscriptions
│   ├── cart.ts                 # Cart CRUD (subcollection: carts/{uid}/items)
│   ├── orders.ts               # Order creation, status updates, stock management
│   ├── address.ts              # Address CRUD + default address management
│   ├── kyc.ts                  # KYC submission + Supabase image upload
│   ├── reviews.ts              # Product reviews + rating recalculation
│   ├── notifications.ts        # Expo Push Token management + local listeners
│   ├── profilePicture.ts       # Profile picture upload to Supabase
│   └── psgc.ts                 # PSGC API (provinces/cities/barangays)
│
├── constants/
│   ├── firebaseConfig.ts       # Firebase app initialization
│   ├── supabaseConfig.ts       # Supabase client initialization
│   ├── categories.ts           # Product category definitions
│   ├── Colors.ts               # Color palette constants
│   └── api.ts                  # API base URL
│
├── hooks/                      # Custom React hooks
├── assets/                     # Images, fonts, splash screen
├── functions/                  # Firebase Cloud Functions
│   └── src/index.ts            # onOrderStatusUpdate + onKYCStatusUpdate
├── scripts/
│   └── seed.ts                 # Firestore data seeding script
├── app.json                    # Expo app configuration
├── eas.json                    # EAS build profiles
├── firebase.json               # Firebase project config
├── firestore.rules             # Firestore security rules
└── tsconfig.json               # TypeScript configuration
```

---

## Firestore Collections

| Collection | Description |
|---|---|
| `products` | Product catalogue (archived flag for soft-delete) |
| `users/{uid}` | User profile, KYC data, account type |
| `users/{uid}/expoPushTokens` | Per-device Expo push tokens |
| `carts/{uid}/items` | Shopping cart items (subcollection) |
| `orders` | Orders with embedded items array |
| `order_items` | Denormalized per-item records for admin dashboard |
| `address` | User delivery addresses |
| `reviews` | Product reviews with ratings |
| `contact_submissions` | Contact form submissions |

---

## Installation

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x (or Yarn)
- **Expo CLI** — installed globally or via `npx`
- **EAS CLI** >= 16.17.4 (for device builds)
- A **Firebase** project with Firestore, Auth, and Storage enabled
- A **Supabase** project with a `kyc-documents` storage bucket

### Clone the Repository

```bash
git clone <your-repository-url>
cd SmoqueBrosApp
```

### Install Dependencies

```bash
npm install
```

---

## Environment Setup

Create a `.env` file in the project root. **Never commit secrets to version control.**

```env
# Local API server (if applicable)
API_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Firebase Configuration

Firebase credentials are initialised in `constants/firebaseConfig.ts`. Update the `firebaseConfig` object with your own Firebase project values:

```ts
const firebaseConfig = {
  apiKey: '<your-api-key>',
  authDomain: '<your-project>.firebaseapp.com',
  projectId: '<your-project-id>',
  storageBucket: '<your-project>.appspot.com',
  messagingSenderId: '<sender-id>',
  appId: '<app-id>',
  measurementId: '<measurement-id>',
};
```

Replace `google-services.json` in the project root with your own Android Firebase configuration file.

### Supabase Configuration

Update `constants/supabaseConfig.ts` with your Supabase project URL and anon key (matching the `.env` values).

---

## Database Setup (Firestore)

### Security Rules

Deploy the included Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

Key rule highlights:
- **Products** — publicly readable; write requires authentication.
- **Users** — read/write restricted to the authenticated owner.
- **Cart / Address / Orders / Order Items / Contact** — scoped to the authenticated user.

### Seeding Initial Data (Optional)

A TypeScript seed script is provided:

```bash
npm run db:seed
```

This command uses `ts-node` with `tsconfig.scripts.json` and requires `serviceAccountKey.json` (Firebase Admin service account) to be present in the project root.

---

## Running the Project

### Start the Metro Bundler (Expo Go)

```bash
npm start
```

> **Note:** Push notifications are **not** available in Expo Go. Use a development build for full functionality.

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

### Run in Browser (Web)

```bash
npm run web
```

### Lint

```bash
npm run lint
```

---

## Push Notifications Setup

Push notifications require a **development build** (not Expo Go).

### 1. Log in and configure EAS credentials

```bash
eas login
eas credentials   # Android -> Push Notifications -> set FCM Server Key
```

### 2. Build a development APK

```bash
eas build --profile development --platform android
```

### 3. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Two functions are deployed:

| Function | Trigger | Action |
|---|---|---|
| `onOrderStatusUpdate` | Write to `orders/{orderId}` | Sends push notification when order status changes |
| `onKYCStatusUpdate` | Update to `users/{userId}` | Notifies user when KYC is verified or rejected |

Verify deployment:

```bash
firebase functions:list
firebase functions:log
```

---

## API Endpoints

This project does not expose a custom REST API. All data operations go directly through the Firebase and Supabase SDKs:

| Integration | Purpose |
|---|---|
| Firebase Auth | User registration, login, email verification, password reset |
| Cloud Firestore | Products, cart, orders, addresses, reviews, users |
| Firebase Storage | (configured, available for future use) |
| Supabase Storage | KYC document uploads, profile pictures |
| PSGC API (`psgc.gitlab.io/api`) | Philippine province, city, and barangay lookups |
| Expo Push API (`exp.host/--/api/v2/push/send`) | Sending push notifications via Cloud Functions |

---

## Deployment Notes

### EAS Build Profiles

| Profile | Purpose | Distribution |
|---|---|---|
| `development` | Local dev with dev client | Internal (sideload) |
| `preview` | Internal QA testing | Internal (sideload) |
| `production` | Public release (APK) | Auto-increment build number |

Build commands:

```bash
# Development build
eas build --profile development --platform android

# Preview build
eas build --profile preview --platform android

# Production APK
eas build --profile production --platform android
```

### Android Configuration

- **Package:** `com.anonymous.SmoqueBrosApp`
- **Permissions:** `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS`
- **Edge-to-edge UI** enabled
- Uses `google-services.json` for FCM

### iOS Configuration

- Supports tablet (`supportsTablet: true`)
- **Deep link scheme:** `smoquebrosapp://`


---



## License

This project is **private** (`"private": true` in `package.json`). All rights reserved. Unauthorised distribution or reproduction is prohibited.
