import admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';

let firebaseAdminInitialized = false;

export function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized) {
    return;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newline characters
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error("Firebase service account credentials are not fully provided. Please check .env file.");
    throw new Error("Missing Firebase service account credentials.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log("Firebase Admin SDK initialized.");
  firebaseAdminInitialized = true;
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

export { db, auth, bucket };
