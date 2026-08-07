import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, Firestore, setDoc } from 'firebase/firestore';

import { FirebaseDocumentStore } from '../../adapters/firebase/FirebaseDocumentStore';
import { FirebaseTenantScope } from '../../adapters/firebase/FirebaseTenantScope';
import { TenantDocumentStore } from '../../adapters/firebase/TenantDocumentStore';
import { documentStoreContract } from '../contracts/documentStoreContract';
import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

describe('Firebase document adapter', () => {
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

  documentStoreContract(
    'Firebase Emulator',
    () =>
      new TenantDocumentStore(
        new FirebaseDocumentStore(
          environment
            .authenticatedContext('super-admin-1', {
              role: 2,
              email: 'admin@gatech.edu',
            })
            .firestore() as unknown as Firestore,
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
