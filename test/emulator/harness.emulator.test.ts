import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

describe('Firebase Emulator harness', () => {
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
  });

  afterEach(async () => {
    await environment.clearFirestore();
  });

  afterAll(async () => {
    await environment.cleanup();
  });

  it('enforces the deployed rules without contacting a real project', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const member = environment.authenticatedContext('member-1').firestore();
    const record = doc(member, 'harness', 'record-1');

    await assertFails(getDoc(doc(anonymous, 'harness', 'record-1')));
    await assertSucceeds(setDoc(record, { ready: true }));
    await expect(assertSucceeds(getDoc(record))).resolves.toMatchObject({
      exists: expect.any(Function),
    });
  });
});
