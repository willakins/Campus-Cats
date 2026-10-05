import {
  deleteApp,
  initializeApp,
} from '../../functions/node_modules/firebase-admin/lib/app/index';
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index';
import { FirebaseWhitelistRateLimiter } from '../../functions/src/onboarding/whitelistRateLimit';
import { revokeMemberSessions } from '../../functions/src/platform/sessionRevocation';
import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

describe('application quotas and revocation persistence', () => {
  const app = initializeApp(
    { projectId: assertDemoProjectId(FIREBASE_TEST_PROJECT_ID) },
    'application-security-tests',
  );
  const firestore = getFirestore(app);
  afterAll(async () => {
    await deleteApp(app);
  });

  it('atomically enforces per-source quotas across concurrent submissions with different emails', async () => {
    const limiter = new FirebaseWhitelistRateLimiter(
      firestore,
      () => new Date('2026-10-05T12:00:00Z'),
      { perIp: 2, perEmail: 3 },
    );
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, index) =>
        limiter.consume('192.0.2.10', `concurrent-${index}@example.test`),
      ),
    );
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      2,
    );
    for (const result of results)
      if (result.status === 'rejected') {
        expect(result.reason).toMatchObject({ code: 'resource-exhausted' });
      }
    // Equivalent address spelling does not create a fresh quota.
    await expect(
      limiter.consume('::ffff:c000:20a', 'extra@example.test'),
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
    await expect(
      limiter.consume('192.0.2.11', 'independent@example.test'),
    ).resolves.toBeUndefined();
  });

  it('limits the same normalized email across IPs and resets an expired window without TTL deletion', async () => {
    let now = new Date('2026-10-05T12:00:00Z');
    const limiter = new FirebaseWhitelistRateLimiter(firestore, () => now);
    for (const ip of ['192.0.2.21', '192.0.2.22', '192.0.2.23']) {
      await limiter.consume(ip, 'limit@example.test');
    }
    await expect(
      limiter.consume('192.0.2.24', 'LIMIT@example.test'),
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
    now = new Date('2026-10-05T12:59:59Z');
    await expect(
      limiter.consume('192.0.2.24', 'limit@example.test'),
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
    now = new Date('2026-10-05T13:00:00Z');
    await expect(
      limiter.consume('192.0.2.24', 'limit@example.test'),
    ).resolves.toBeUndefined();
  });

  it('persists the Auth cutoff and does not restore older sessions on retries', async () => {
    const reference = firestore.collection('users').doc('revocation-member');
    await reference.set({ clubId: 'campus-cats', banned: true });
    let serverCutoff = '2026-10-05T12:00:00.000Z';
    const calls: string[] = [];
    const auth = {
      async revokeRefreshTokens(uid: string) {
        calls.push(`revoke:${uid}`);
      },
      async getUser(uid: string) {
        calls.push(`get:${uid}`);
        return { tokensValidAfterTime: serverCutoff };
      },
    };
    await revokeMemberSessions(firestore, auth, 'revocation-member');
    const cutoff = (await reference.get()).data()?.sessionRevokedAt;
    expect(cutoff).toBe(Date.parse('2026-10-05T12:00:00.000Z') / 1000);
    expect(calls).toEqual([
      'revoke:revocation-member',
      'get:revocation-member',
    ]);
    serverCutoff = '2026-10-05T11:59:00.000Z';
    await revokeMemberSessions(firestore, auth, 'revocation-member');
    expect((await reference.get()).data()?.sessionRevokedAt).toBe(cutoff);
    await reference.update({ banned: false });
    expect((await reference.get()).data()?.sessionRevokedAt).toBe(cutoff);
  });

  it('fails closed when Auth cannot provide a cutoff', async () => {
    await expect(
      revokeMemberSessions(
        firestore,
        {
          revokeRefreshTokens: async () => undefined,
          getUser: async () => ({}),
        },
        'unavailable-cutoff',
      ),
    ).rejects.toThrow('cutoff is unavailable');
  });
});
