import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA3B7Im2zNhjS73WZMXtX-UNuc-YH_zy6M",
  authDomain: "talkwithvideo-f2765.firebaseapp.com",
  projectId: "talkwithvideo-f2765",
  storageBucket: "talkwithvideo-f2765.firebasestorage.app",
  messagingSenderId: "346527519468",
  appId: "1:346527519468:android:81f6ec1ce9ba6422960bc9"
};

// if (!firebase.apps.length) {
//   firebase.initializeApp(firebaseConfig);
// }
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Firebase init error', err);
  }
}

// Firestore collections structure:
// - calls (collection)
//   - {callId} (document)
//     - peers (subcollection)
//       - {peerId} (document)
//         - offer: string
//         - answer: string
//         - iceCandidates: array
//         - status: string

export { firebase, auth, firestore };