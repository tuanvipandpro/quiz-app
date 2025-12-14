// contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';
import { saveApiKey, clearApiKey } from '../utils/geminiApi';

// Create Auth Context
const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isAuthenticated: false,
  refreshUserProfile: async () => {}
});

/**
 * Auth Provider Component
 * Manages authentication state for the entire application
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Initialize user in Firestore
   */
  const initializeUserInFirestore = async (firebaseUser) => {
    try {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified
      };

      // Initialize or update user in Firestore
      const result = await userService.initializeUser(userData);
      
      if (result.success) {
        setUserProfile(result.user);
        
        // Sync API key from Firestore to localStorage
        if (result.user.geminiApiKey) {
          await saveApiKey(result.user.geminiApiKey, userData.uid);
          console.log('API key synced from Firestore to localStorage');
        }
      }
    } catch (error) {
      console.error('Error initializing user in Firestore:', error);
    }
  };

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified
        };
        
        setUser(userData);
        
        // Initialize user in Firestore and get profile
        await initializeUserInFirestore(firebaseUser);
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  /**
   * Refresh user profile from Firestore
   */
  const refreshUserProfile = async () => {
    if (user && user.uid) {
      const result = await userService.getUserProfile(user.uid);
      if (result.success) {
        setUserProfile(result.user);
      }
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    const result = await authService.signInWithGoogle();
    return result;
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    const result = await authService.signOut();
    if (result.success) {
      // Clear API key from localStorage when logging out
      await clearApiKey(user?.uid);
      console.log('API key cleared from localStorage on logout');
      
      setUser(null);
      setUserProfile(null);
    }
    return result;
  };

  // Context value
  const value = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use auth context
 * @returns {Object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
