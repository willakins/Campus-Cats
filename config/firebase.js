import { getAuth } from 'firebase/auth';

import { app, db, firebaseConfig, storage } from './firebaseApp';

const auth = getAuth(app);

export { app, auth, firebaseConfig, storage, db };
