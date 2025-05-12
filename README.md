# React Native Video Call App

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

This React Native app enables video calling between registered users using Firebase and WebRTC. It includes user authentication, real-time call signaling via Firestore, and peer-to-peer video communication.

---

## Tech Stack

- **React Native**: 0.79.0 (latest)
- **React**: 19.0.0
- **Yarn**: 4.7.0
- **Node**: 20.0.0
- **Firebase** (Authentication + Firestore)
- **react-native-webrtc**

---

## Features

- **Secure Authentication** using Firebase Email/Password

- **Demo user Credentials**

- **E-Mail - demo03@gmail.com**
- **Password - Password123**


- **User Registration & Login**
- **User Listing** on Home Screen
- **Video Calling**  
  - Initiate video calls by tapping on a user  
  - Receiver gets a popup to attend the call  
  - Real-time video is connected once the call is accepted  
- **Call ID & Join Option**  
  - Users can copy their Call ID  
  - Others can join by pasting the Call ID and clicking Join
- **Firestore Structure**  
  - `users` collection: stores registered user info  
  - `calls` collection: handles signaling and call states
- **Logout Functionality**

---

## Firebase Setup

To use your own Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/) and **create a new project**.
2. Add a new **Android app** to the project:
   - Package name (e.g., `com.videocallapp`)
   - Download the `google-services.json` file.
3. **Place `google-services.json` into `android/app/`** directory.
4. Enable **Email/Password Authentication** in Firebase Console → Authentication → Sign-in Method.
5. Enable **Cloud Firestore** in Firebase Console → Firestore Database → Create Database.

### Firebase Configuration Example

Edit the Firebase config inside `src/services/firebase.js`:

```js
// src/services/firebase.js

import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

export const app = initializeApp(firebaseConfig);
