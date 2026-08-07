import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, Firestore, setDoc } from 'firebase/firestore';

import { FirebaseInaturalistReader } from '../../adapters/firebase/FirebaseInaturalistReader';
import { FirebaseTenantScope } from '../../adapters/firebase/FirebaseTenantScope';
import { inaturalistReaderContract } from '../contracts/inaturalistReaderContract';
import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

describe('Firebase iNaturalist reader adapter', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: assertDemoProjectId(FIREBASE_TEST_PROJECT_ID),
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(doc(firestore, 'users', 'admin-inat-reader'), {
          email: 'admin@gatech.edu',
          role: 1,
          clubId: 'campus-cats',
          platformAdmin: false,
        }),
        setDoc(doc(firestore, 'clubs', 'campus-cats'), {
          name: 'Campus Cats',
          timezone: 'America/New_York',
          billingEmail: 'billing@example.com',
          billingEnforcementEnabled: false,
          accessState: 'enabled',
        }),
        setDoc(doc(firestore, 'clubs', 'campus-cats', 'inaturalist-observations', '1001'), {
          visible: true,
          displayName: 'Goldie',
        }),
        setDoc(doc(firestore, 'clubs', 'campus-cats', 'inaturalist-observations', '1002'), {
          visible: false,
          displayName: 'Hidden cat',
        }),
        setDoc(doc(firestore, 'clubs', 'campus-cats', 'inaturalist-guide-profiles', '2001'), {
          visible: true,
          displayName: 'Goldie',
        }),
        setDoc(doc(firestore, 'clubs', 'campus-cats', 'inaturalist-guide-profiles', '2002'), {
          visible: false,
          displayName: 'Retired profile',
        }),
        setDoc(doc(firestore, 'clubs', 'campus-cats', 'integration-state', 'inaturalist'), {
          running: false,
          lastStatus: 'success',
        }),
      ]);
    });
  });

  afterAll(async () => {
    await environment.cleanup();
  });

  inaturalistReaderContract(
    'Firebase Emulator',
    () =>
      new FirebaseInaturalistReader(
        environment
          .authenticatedContext('admin-inat-reader', {
            email: 'admin@gatech.edu',
          })
          .firestore() as unknown as Firestore,
        new FirebaseTenantScope(),
      ),
  );
});
