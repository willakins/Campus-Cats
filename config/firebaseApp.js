import { applicationId } from 'expo-application';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { nativeFirebaseConfig as firebaseConfig } from './firebaseConfig';
import { validateNativeAppEnvironment } from './nativeAppEnvironment';

validateNativeAppEnvironment(
  process.env.EXPO_PUBLIC_APP_ENV,
  applicationId,
);

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export { app, db, firebaseConfig, storage };
