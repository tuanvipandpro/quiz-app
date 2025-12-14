// services/authService.js
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Auth Service - Handles all authentication operations
 */
class AuthService {
  constructor() {
    this.googleProvider = new GoogleAuthProvider();
    // Add custom parameters to reduce COOP warnings
    this.googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }

  /**
   * Sign in with Google
   * @returns {Promise<UserCredential>}
   */
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, this.googleProvider);
      
      // Get user info
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        },
        credential
      };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      
      // Handle specific error codes
      let errorMessage = 'Failed to sign in with Google';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in popup was closed';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Sign-in was cancelled';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Sign-in popup was blocked by browser';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        default:
          errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        code: error.code
      };
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current user
   * @returns {User|null}
   */
  getCurrentUser() {
    return auth.currentUser;
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - Callback function that receives user object
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!auth.currentUser;
  }

  /**
   * Get user display info
   * @returns {Object|null}
   */
  getUserInfo() {
    const user = auth.currentUser;
    
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified
    };
  }
}

// Export singleton instance
export default new AuthService();
