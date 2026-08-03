import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { FirebaseStorage } from 'firebase/storage';

import { FirebaseMediaStore } from '../../adapters/firebase/FirebaseMediaStore';
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
    });
  });

  afterAll(async () => {
    await environment.cleanup();
  });

  mediaStoreContract(
    'Firebase Emulator',
    () =>
      new FirebaseMediaStore(
        environment
          .authenticatedContext('super-admin-1', {
            role: 2,
            email: 'admin@gatech.edu',
          })
          .storage() as unknown as FirebaseStorage,
        async () => new Blob(['cat-image'], { type: 'image/jpeg' }),
      ),
  );
});
