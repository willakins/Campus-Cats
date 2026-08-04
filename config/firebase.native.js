import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

import { app, db, firebaseConfig, storage } from './firebaseApp';
import { samlConfiguration } from './firebaseConfig';

const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export { app, auth, db, firebaseConfig, samlConfiguration, storage };
