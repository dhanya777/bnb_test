import { initializeApp } from 'firebase/app';
// Fix: Import `getAuth` function
import { getAuth } from 'firebase/auth';
// TODO: Replace with your Firebase config
// For a production app, use environment variables to hide these.
// const firebaseConfig = {
//   apiKey: "YOUR_FIREBASE_API_KEY",
//   authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
//   projectId: "YOUR_FIREBASE_PROJECT_ID",
//   storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
//   messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
//   appId: "YOUR_FIREBASE_APP_ID"
// };
const firebaseConfig = {
  apiKey: "AIzaSyDChaXPX5XO3-4VVC43o7FFyF-LkjD2rbg",
  authDomain: "uphr-vault-demo.firebaseapp.com",
  projectId: "uphr-vault-demo",
  storageBucket: "uphr-vault-demo.firebasestorage.app",
  messagingSenderId: "101316573436",
  appId: "1:101316573436:web:a8ca740966d9013635bf79"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);