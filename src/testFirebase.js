// Test Firebase Authentication Setup
// This file helps verify your Firebase configuration is correct

import { auth } from './config/firebase';
import authService from './services/authService';

/**
 * Test Firebase Configuration
 * Run this in browser console to verify setup
 */
export const testFirebaseConfig = () => {
  console.log('🔍 Testing Firebase Configuration...\n');
  
  // Test 1: Check if Firebase is initialized
  console.log('1. Firebase Auth Instance:', auth ? '✅ OK' : '❌ FAILED');
  
  // Test 2: Check if authService is available
  console.log('2. Auth Service:', authService ? '✅ OK' : '❌ FAILED');
  
  // Test 3: Check current user
  const currentUser = authService.getCurrentUser();
  console.log('3. Current User:', currentUser ? `✅ Logged in as ${currentUser.email}` : 'ℹ️ Not logged in');
  
  // Test 4: Check if methods exist
  console.log('4. signInWithGoogle method:', typeof authService.signInWithGoogle === 'function' ? '✅ OK' : '❌ FAILED');
  console.log('5. signOut method:', typeof authService.signOut === 'function' ? '✅ OK' : '❌ FAILED');
  
  console.log('\n✨ Firebase setup verification complete!');
  
  if (!currentUser) {
    console.log('\n💡 Tip: Click the "Login" button to test Google Sign-In');
  }
};

// Auto-run test in development
if (import.meta.env.DEV) {
  console.log('🚀 Firebase Authentication Ready');
  console.log('📝 Run testFirebaseConfig() in console to verify setup');
}

export default testFirebaseConfig;
