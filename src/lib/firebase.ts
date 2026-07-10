import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, GoogleAuthProvider, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasRealValue = (value?: string) => Boolean(value && !value.startsWith("MY_") && !value.startsWith("REPLACE_"));

export const isFirebaseConfigured = () => (
  hasRealValue(firebaseConfig.apiKey) &&
  hasRealValue(firebaseConfig.projectId) &&
  hasRealValue(firebaseConfig.appId)
);

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;

export const getFirebaseDb = () => {
  if (!isFirebaseConfigured()) return null;

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (!firestoreDb) {
    firestoreDb = getFirestore(firebaseApp);
  }

  return firestoreDb;
};

export const getFirebaseAuth = () => {
  if (!isFirebaseConfigured()) return null;

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp);
  }

  return firebaseAuth;
};

export const getGoogleAuthProvider = () => new GoogleAuthProvider();