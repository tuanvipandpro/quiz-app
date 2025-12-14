// config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase configuration
// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbnG550P3or_hlBlCqrLLbm6iYkBgw9kU",
  authDomain: "quiz-app-f70d5.firebaseapp.com",
  projectId: "quiz-app-f70d5",
  storageBucket: "quiz-app-f70d5.firebasestorage.app",
  messagingSenderId: "124997463594",
  appId: "1:124997463594:web:a1e2b6a4d3cf82f6b0dd53",
  measurementId: "G-WLC1YFJQ2D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app;
