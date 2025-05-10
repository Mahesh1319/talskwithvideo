import { v4 as uuidv4 } from 'uuid';

// Generate a unique call ID
export const generateCallId = () => {
  return uuidv4().replace(/-/g, '').substring(0, 10);
};

// Parse Firebase snapshot data
export const parseFirebaseSnapshot = (snapshot) => {
  if (!snapshot.exists) return null;
  
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    // Convert Firebase Timestamp to JS Date if needed
    createdAt: data?.createdAt?.toDate() || null,
    updatedAt: data?.updatedAt?.toDate() || null,
  };
};

// Validate email format
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Format SDP for display
export const formatSDP = (sdp) => {
  if (!sdp) return '';
  try {
    const obj = typeof sdp === 'string' ? JSON.parse(sdp) : sdp;
    return `Type: ${obj.type}\nSDP: ${obj.sdp.substring(0, 50)}...`;
  } catch {
    return 'Invalid SDP';
  }
};

// Get current timestamp
export const getTimestamp = () => {
  return new Date().toISOString();
};

// Check if object is empty
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};