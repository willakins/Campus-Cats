import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

describe('safety report client isolation', () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: assertDemoProjectId(FIREBASE_TEST_PROJECT_ID),
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'safety-reports/private-case'), {
        reporterId: 'safety-member',
        description: 'Private test report',
      });
      await setDoc(doc(db, 'safety-reports/private-case/history/review'), {
        note: 'Private case note',
      });
      for (const [id, role, platformAdmin] of [
        ['safety-member', 0, false],
        ['safety-officer', 3, false],
        ['safety-admin', 4, true],
      ] as const) {
        await setDoc(doc(db, `users/${id}`), {
          email: `${id}@example.test`,
          clubId: 'test-club',
          role,
          platformAdmin,
          agreedToTerms: true,
          termsVersion: '2026-08-28',
        });
      }
    });
  });
  afterAll(async () => {
    await env.cleanup();
  });
  it.each(['signed-out', 'safety-member', 'safety-officer', 'safety-admin'])(
    'denies direct reads, lists, history and forged writes for %s',
    async (uid) => {
      const db = (
        uid === 'signed-out'
          ? env.unauthenticatedContext()
          : env.authenticatedContext(uid)
      ).firestore();
      await assertFails(getDoc(doc(db, 'safety-reports/private-case')));
      await assertFails(getDocs(collection(db, 'safety-reports')));
      await assertFails(
        getDoc(doc(db, 'safety-reports/private-case/history/review')),
      );
      await assertFails(
        setDoc(doc(db, 'safety-reports/forged'), {
          reporterId: uid,
          status: 'closed',
        }),
      );
      await assertFails(
        setDoc(doc(db, `safety-report-limits/${uid}`), { count: 0 }),
      );
    },
  );
});
