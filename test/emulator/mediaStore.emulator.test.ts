import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { FirebaseStorage } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

import { FirebaseMediaStore } from '../../adapters/firebase/FirebaseMediaStore';
import { FirebaseTenantScope } from '../../adapters/firebase/FirebaseTenantScope';
import { TenantMediaStore } from '../../adapters/firebase/TenantMediaStore';
import { mediaStoreContract } from '../contracts/mediaStoreContract';
import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

describe('Firebase media adapter', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: assertDemoProjectId(FIREBASE_TEST_PROJECT_ID),
      storage: {
        host: '127.0.0.1',
        port: 9199,
        rules: readFileSync(resolve(process.cwd(), 'storage.rules'), 'utf8'),
      },
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', 'super-admin-1'), {
        email: 'admin@gatech.edu',
        role: 2,
        clubId: 'campus-cats',
        platformAdmin: false,
        banned: false,
      });
      await setDoc(doc(context.firestore(), 'clubs', 'campus-cats'), {
        name: 'Campus Cats',
        timezone: 'America/New_York',
        billingEmail: 'billing@example.com',
        billingEnforcementEnabled: false,
        maintenanceMode: false,
        accessState: 'enabled',
      });
    });
  });

  afterAll(async () => {
    await environment.cleanup();
  });

  mediaStoreContract(
    'Firebase Emulator',
    () =>
      new TenantMediaStore(
        new FirebaseMediaStore(
          environment
            .authenticatedContext('super-admin-1', {
              role: 2,
              email: 'admin@gatech.edu',
            })
            .storage() as unknown as FirebaseStorage,
          async () => new Blob(['cat-image'], { type: 'image/jpeg' }),
        ),
        tenantScope(),
      ),
  );
});
const tenantScope = () => {
  const scope = new FirebaseTenantScope();
  scope.setAuthenticatedClub('campus-cats');
  return scope;
};
