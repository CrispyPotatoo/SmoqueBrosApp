# Smoque Bros App

A React Native mobile application for vape product sales with Firebase backend.

## Features

- Product browsing and purchasing
- User authentication
- Shopping cart functionality
- Order management
- Real-time inventory updates

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure Firebase
   - Update `constants/firebaseConfig.ts` with your Firebase credentials

3. Seed the database
   ```bash
   npm run db:seed
   ```

4. Start the app
   ```bash
   npx expo start
   ```

## Tech Stack

- React Native with Expo
- Firebase (Auth, Firestore, Storage)
- TypeScript
- Expo Router
