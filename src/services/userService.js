// services/userService.js
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import app from '../config/firebase';

const db = getFirestore(app);
const USERS_COLLECTION = 'users';

/**
 * User Service - Handles Firestore user operations
 */
class UserService {
  /**
   * Get user document reference
   * @param {string} uid - User ID
   * @returns {DocumentReference}
   */
  getUserDocRef(uid) {
    return doc(db, USERS_COLLECTION, uid);
  }

  /**
   * Check if user exists in Firestore
   * @param {string} uid - User ID
   * @returns {Promise<boolean>}
   */
  async userExists(uid) {
    try {
      const userDocRef = this.getUserDocRef(uid);
      const userDoc = await getDoc(userDocRef);
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  /**
   * Create new user in Firestore
   * @param {Object} userData - User data from Firebase Auth
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    try {
      const { uid, email, displayName, photoURL, emailVerified } = userData;
      
      const userDocRef = this.getUserDocRef(uid);
      
      const userProfile = {
        uid,
        email,
        displayName,
        photoURL,
        emailVerified,
        geminiApiKey: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      };

      await setDoc(userDocRef, userProfile);
      
      console.log('User created in Firestore:', uid);
      return {
        success: true,
        user: userProfile
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user profile from Firestore
   * @param {string} uid - User ID
   * @returns {Promise<Object>}
   */
  async getUserProfile(uid) {
    try {
      const userDocRef = this.getUserDocRef(uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return {
          success: true,
          user: userDoc.data()
        };
      } else {
        return {
          success: false,
          error: 'User not found'
        };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user's last login timestamp
   * @param {string} uid - User ID
   * @returns {Promise<Object>}
   */
  async updateLastLogin(uid) {
    try {
      const userDocRef = this.getUserDocRef(uid);
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating last login:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save Gemini API key to user profile
   * @param {string} uid - User ID
   * @param {string} apiKey - Gemini API key
   * @returns {Promise<Object>}
   */
  async saveGeminiApiKey(uid, apiKey) {
    try {
      const userDocRef = this.getUserDocRef(uid);
      await updateDoc(userDocRef, {
        geminiApiKey: apiKey,
        updatedAt: serverTimestamp()
      });
      
      console.log('API key saved to Firestore for user:', uid);
      return { success: true };
    } catch (error) {
      console.error('Error saving API key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Gemini API key from user profile
   * @param {string} uid - User ID
   * @returns {Promise<string|null>}
   */
  async getGeminiApiKey(uid) {
    try {
      const result = await this.getUserProfile(uid);
      if (result.success && result.user) {
        return result.user.geminiApiKey || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  /**
   * Clear Gemini API key from user profile
   * @param {string} uid - User ID
   * @returns {Promise<Object>}
   */
  async clearGeminiApiKey(uid) {
    try {
      const userDocRef = this.getUserDocRef(uid);
      await updateDoc(userDocRef, {
        geminiApiKey: null,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing API key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initialize or update user on login
   * Creates user if first time, updates last login if returning
   * @param {Object} userData - User data from Firebase Auth
   * @returns {Promise<Object>}
   */
  async initializeUser(userData) {
    try {
      const exists = await this.userExists(userData.uid);
      
      if (!exists) {
        // First time user - create profile
        console.log('First time login - creating user profile');
        return await this.createUser(userData);
      } else {
        // Returning user - update last login
        console.log('Returning user - updating last login');
        await this.updateLastLogin(userData.uid);
        return await this.getUserProfile(userData.uid);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const userService = new UserService();
export default userService;
