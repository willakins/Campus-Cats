import {
  deleteApp,
  initializeApp,
} from '../../functions/node_modules/firebase-admin/lib/app/index';
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index';

import { FirebaseInaturalistAccountLinkRepository } from '../../functions/src/firebaseInaturalistAccountLinks';
import { HandlerError } from '../../functions/src/handlers';
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
