import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.log('Firebase Messaging is not supported in this environment');
    }
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db, messaging };
