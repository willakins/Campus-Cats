import { getAuth } from 'firebase/auth';

import { app, db, firebaseConfig, storage } from './firebaseApp';
import { samlConfiguration } from './firebaseConfig';

const auth = getAuth(app);

export { app, auth, firebaseConfig, samlConfiguration, storage, db };
