// contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';
import { credentials, clearLlmSession } from '../services/llm';

// Create Auth Context
const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  isAuthenticated: false,
  refreshUserProfile: async () => {},
});

/**
 * Auth Provider Component
 * Manages authentication state for the entire application
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const activeUid = useRef(null);
  const authRevision = useRef(0);

  /**
   * Initialize user in Firestore
   */
  const initializeUserInFirestore = async (firebaseUser, revision) => {
    try {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
      };

      // Initialize or update user in Firestore
      const result = await userService.initializeUser(userData);

      if (
        result.success &&
        activeUid.current === userData.uid &&
        authRevision.current === revision
      ) {
        setUserProfile(result.user);
        credentials.prime(userData.uid, result.user);
      }
    } catch (error) {
      console.error('Error initializing user in Firestore:', error);
    }
  };

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      const revision = ++authRevision.current;
      const nextUid = firebaseUser?.uid || null;
      clearLlmSession({ clearGuest: !!nextUid || !!activeUid.current });
      activeUid.current = nextUid;
      setUserProfile(null);
      if (firebaseUser) {
        // User is signed in
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        };

        setUser(userData);

        // Initialize user in Firestore and get profile
        await initializeUserInFirestore(firebaseUser, revision);
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
      }

      if (authRevision.current === revision) setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      authRevision.current++;
      activeUid.current = null;
      unsubscribe();
      clearLlmSession();
    };
  }, []);

  /**
   * Refresh user profile from Firestore
   */
  const refreshUserProfile = async () => {
    if (user && user.uid) {
      const revision = authRevision.current;
      const result = await userService.getUserProfile(user.uid);
      if (result.success && activeUid.current === user.uid && authRevision.current === revision) {
        setUserProfile(result.user);
        credentials.prime(user.uid, result.user);
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
      // Logging out must not delete credentials saved in the user's profile.
      authRevision.current++;
      activeUid.current = null;
      clearLlmSession({ clearGuest: true });

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
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
