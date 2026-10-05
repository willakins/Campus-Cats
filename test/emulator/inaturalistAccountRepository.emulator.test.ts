import {
  deleteApp,
  initializeApp,
} from '../../functions/node_modules/firebase-admin/lib/app/index';
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index';

import { FirebaseInaturalistAccountLinkRepository } from '../../functions/src/integrations/inaturalist/firebaseInaturalistAccountLinks';
import { HandlerError } from '../../functions/src/shared/handlers';
import { FIREBASE_TEST_PROJECT_ID, assertDemoProjectId } from '../support/firebaseProject';

describe('Firebase iNaturalist account-link transactions', () => {
  const projectId = assertDemoProjectId(FIREBASE_TEST_PROJECT_ID);
  const app = initializeApp({ projectId }, 'inaturalist-account-link-tests');
  const firestore = getFirestore(app);
  const repository = new FirebaseInaturalistAccountLinkRepository(firestore);
  const now = new Date('2026-08-06T12:00:00.000Z');

  afterAll(async () => {
    await deleteApp(app);
  });

  async function beginAndClaim(
    stateHash: string,
    firebaseUid: string,
    attemptId: string,
  ) {
    await firestore.collection('users').doc(firebaseUid).set({ clubId: 'campus-cats', banned: false });
    await repository.createAttempt(stateHash, {
      firebaseUid,
      clubId: 'campus-cats',
      attemptId,
      codeVerifier: `verifier-${attemptId}`,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 10 * 60_000),
      status: 'pending',
    });
    const attempt = await repository.claimAttempt(stateHash, now);
    expect(attempt).toMatchObject({ firebaseUid, status: 'processing' });
  }

  it('does not recreate a link from a callback already processing when unlinked', async () => {
    await beginAndClaim('state-unlinked', 'unlinked-member', 'attempt-unlinked');
    await repository.unlink('unlinked-member');
    await expect(repository.completeAttempt('state-unlinked', { inaturalistUserId: 100, login: 'unlinked' }, now))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(await repository.getLink('unlinked-member')).toBeUndefined();
  });

  it('invalidates an older callback when a new linking attempt starts', async () => {
    await beginAndClaim('state-older', 'new-attempt-member', 'attempt-older');
    await beginAndClaim('state-newer', 'new-attempt-member', 'attempt-newer');
    await expect(repository.completeAttempt('state-older', { inaturalistUserId: 101, login: 'older' }, now))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    await repository.completeAttempt('state-newer', { inaturalistUserId: 102, login: 'newer' }, now);
    expect(await repository.getLink('new-attempt-member')).toMatchObject({ inaturalistUserId: 102 });
  });

  it('rejects completion after expiration and after a ban, deletion, or tenant change', async () => {
    for (const action of ['expired', 'banned', 'pending-deletion', 'deleted', 'moved']) {
      const uid = `invalid-${action}`;
      const state = `state-${action}`;
      await beginAndClaim(state, uid, `attempt-${action}`);
      const member = firestore.collection('users').doc(uid);
      if (action === 'banned') await member.update({ banned: true });
      if (action === 'pending-deletion') await member.update({ deletionPending: true });
      if (action === 'deleted') await member.delete();
      if (action === 'moved') await member.update({ clubId: 'another-club' });
      const completedAt = action === 'expired' ? new Date(now.getTime() + 10 * 60_000) : now;
      await expect(repository.completeAttempt(state, { inaturalistUserId: 103, login: 'invalid' }, completedAt))
        .rejects.toMatchObject({ code: action === 'expired' ? 'failed-precondition' : 'permission-denied' });
      expect(await repository.getLink(uid)).toBeUndefined();
    }
  });

  it('enforces one owner per numeric iNaturalist account and relinks atomically', async () => {
    await beginAndClaim('state-member-1', 'member-1', 'attempt-1');
    await repository.completeAttempt(
      'state-member-1',
      { inaturalistUserId: 42, login: 'cat_watcher' },
      now,
    );

    await beginAndClaim('state-member-2', 'member-2', 'attempt-2');
    await expect(
      repository.completeAttempt(
        'state-member-2',
        { inaturalistUserId: 42, login: 'same_account' },
        now,
      ),
    ).rejects.toMatchObject<Partial<HandlerError>>({ code: 'already-exists' });

    await beginAndClaim('state-member-1-relink', 'member-1', 'attempt-3');
    await repository.completeAttempt(
      'state-member-1-relink',
      { inaturalistUserId: 43, login: 'new_account' },
      now,
    );
    expect(await firestore.collection('clubs').doc('campus-cats').collection('inaturalist-public-links').doc('42').get())
      .toMatchObject({ exists: false });
    expect(
      (await firestore.collection('clubs').doc('campus-cats').collection('inaturalist-public-links').doc('43').get()).data(),
    ).toMatchObject({ userId: 'member-1', login: 'new_account' });

    await repository.unlink('member-1');
    expect(await repository.getLink('member-1')).toBeUndefined();
    expect(await firestore.collection('clubs').doc('campus-cats').collection('inaturalist-public-links').doc('43').get())
      .toMatchObject({ exists: false });
    await expect(repository.unlink('member-1')).resolves.toBeUndefined();
  });
});
