import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: replace with the real Marble Studios Firebase project config.
// Get this from Firebase Console > Project settings > General > Your apps > SDK setup and configuration.
const firebaseConfig = {
  apiKey: 'TODO',
  authDomain: 'TODO',
  projectId: 'TODO',
  storageBucket: 'TODO',
  messagingSenderId: 'TODO',
  appId: 'TODO',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
