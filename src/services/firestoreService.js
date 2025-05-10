// src/services/firestoreService.js
import { firestore } from './firebase';
import { handleFirestoreError } from '../utils/errorHandler';

export const safeFirestoreCall = async (operation) => {
  try {
    return await operation();
  } catch (err) {
    console.error("Firestore error:", err);
    throw new Error(handleFirestoreError(err));
  }
};

// Usage example:
// await safeFirestoreCall(() => 
//   firestore().collection('calls').doc(callId).update()
// );