// src/utils/errorHandler.js
export const handleFirestoreError = (error) => {
  if (!error.code) return "Operation failed";
  
  switch (error.code) {
    case 'permission-denied':
      return "You don't have permission for this action";
    case 'unauthenticated':
      return "Please sign in to continue";
    case 'resource-exhausted':
      return "Too many requests. Try again later";
    case 'failed-precondition':
      return "Call already ended";
    case 'not-found':
      return "Call session expired";
    default:
      console.warn("Unhandled Firestore error:", error);
      return "Operation failed. Please try again.";
  }
};