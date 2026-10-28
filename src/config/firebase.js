import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import publicProject from './firebaseProject.json';

// Firebase web identifiers are public. Provider AI keys are never build-time config.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || publicProject.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || publicProject.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || publicProject.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || publicProject.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || publicProject.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || publicProject.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || publicProject.measurementId,
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
