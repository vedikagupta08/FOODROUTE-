import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, onAuthStateChanged } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile 
} from 'firebase/auth';
import api from '../config/api';
import toast from 'react-hot-toast';

/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Register a new user
   */
  const register = async (email, password, name, role, additionalData = {}) => {
    try {
      console.log("🔐 Registering new user:", email);
      
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      // Register user in backend
      const token = await userCredential.user.getIdToken();
      const response = await api.post('/auth/register', {
        name,
        role,
        ...additionalData
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Logout after registration so user has to login manually
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);

      toast.success('Account created successfully! Please login to continue.');
      return response.data.user;
    } catch (error) {
      console.error('❌ Registration error:', error);
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  /**
   * Login user
   */
  
      
     const login = async (email, password) => {
  try {
    console.log("🔐 Logging in user:", email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Set currentUser immediately
    setCurrentUser(userCredential.user);
    
    const token = await userCredential.user.getIdToken();

    const response = await api.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setUserProfile(response.data.user);
    toast.success('Login successful!');
    
    // Return the user profile for routing
    return response.data.user;
  } catch (error) {
    console.error('❌ Login error:', error);
    toast.error(error.message || 'Login failed');
    throw error;
  }
};

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      console.log("🔐 Logging out user");
      
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast.error('Logout failed');
      throw error;
    }
  };

  /**
   * Update user profile
   */
  const updateUserProfile = async (data) => {
    try {
      const response = await api.put('/auth/profile', data);
      setUserProfile(response.data.user);
      toast.success('Profile updated successfully!');
      return response.data.user;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      toast.error('Profile update failed');
      throw error;
    }
  };

  // Monitor Firebase auth state
  useEffect(() => {
    let isSubscribed = true;
    let lastUser = null;
    let isProcessing = false;
    let profileCache = new Map();
    let lastCallTime = 0;
    let unsubscribe = null;
    
    // Completely stop the listener after first successful auth
    const handleAuthStateChange = async (user) => {
      const now = Date.now();
      
      // Aggressive rate limiting - prevent calls more than once per 5 seconds
      if (now - lastCallTime < 5000) {
        console.log("🔄 Rate limiting auth state change");
        return;
      }
      
      if (!isSubscribed || isProcessing) {
        console.log("🔄 Auth listener not subscribed or already processing");
        return;
      }
      
      // Prevent duplicate calls for same user
      if (lastUser && user && lastUser.uid === user.uid) {
        console.log("🔄 Skipping duplicate auth state change for same user");
        return;
      }
      
      // Set processing flag immediately
      isProcessing = true;
      lastCallTime = now;
      lastUser = user;
      
      console.log("🔄 Firebase auth state changed:", user?.email || 'No user');
      
      setCurrentUser(user);
      
      if (user) {
        try {
          // Check cache first
          if (profileCache.has(user.uid)) {
            console.log("🔄 Using cached profile for:", user.email);
            setUserProfile(profileCache.get(user.uid));
            setLoading(false);
            
            // IMPORTANT: Unsubscribe after successful auth to prevent loops
            if (unsubscribe) {
              console.log("🔌 Unsubscribing from auth listener after successful auth");
              unsubscribe();
              unsubscribe = null;
            }
            
            isProcessing = false;
            return;
          }
          
          // Get user profile from backend
          const token = await user.getIdToken();
          const response = await api.get('/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (isSubscribed) {
            // Cache the profile
            profileCache.set(user.uid, response.data.user);
            setUserProfile(response.data.user);
            
            // IMPORTANT: Unsubscribe after successful auth to prevent loops
            if (unsubscribe) {
              console.log("🔌 Unsubscribing from auth listener after successful auth");
              unsubscribe();
              unsubscribe = null;
            }
          }
        } catch (error) {
          console.error('❌ Failed to get user profile:', error);
          if (isSubscribed) {
            setUserProfile(null);
            profileCache.delete(user.uid);
          }
        }
      } else {
        if (isSubscribed) {
          setUserProfile(null);
        }
      }
      
      if (isSubscribed) {
        setLoading(false);
      }
      
      // Reset processing flag
      setTimeout(() => {
        isProcessing = false;
      }, 2000);
    };
    
    // Start listening
    unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    return () => {
      console.log('🧹 Cleaning up auth listener');
      isSubscribed = false;
      profileCache.clear();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    register,
    login,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
