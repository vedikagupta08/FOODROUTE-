import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

/**
 * Firebase configuration
 * Initialize Firebase app
 */
const firebaseConfig = {
  apiKey: "AIzaSyBkmg6YEymCBH6fYisda4nvMYOarbDN9fI",
  authDomain: "foodroute-f18f3.firebaseapp.com",
  projectId: "foodroute-f18f3",
  storageBucket: "foodroute-f18f3.firebasestorage.app",
  messagingSenderId: "282820421742",
  appId: "1:282820421742:web:10f961ada310e56ba25e7f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Export onAuthStateChanged for use in AuthContext
export { onAuthStateChanged };

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
