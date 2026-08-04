import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';

import { app, db, firebaseConfig, storage } from './firebaseApp';

const auth = (() => {
  if (typeof window !== 'undefined') return getAuth(app);

  try {
    return initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(app);
  }
})();

export { app, auth, db, firebaseConfig, storage };
