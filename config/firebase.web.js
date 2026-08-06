import {
  browserLocalPersistence,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
} from 'firebase/auth';

import { app, db, firebaseConfig, storage } from './firebaseApp';
import { samlConfiguration } from './firebaseConfig';

const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence:
        typeof window === 'undefined' ? inMemoryPersistence : browserLocalPersistence,
    });
  } catch {
    // Fast Refresh can evaluate this module after Auth has already been initialized.
    return getAuth(app);
  }
})();

export { app, auth, db, firebaseConfig, samlConfiguration, storage };
