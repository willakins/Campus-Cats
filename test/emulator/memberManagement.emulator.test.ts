import {
  initializeApp,
  deleteApp,
} from '../../functions/node_modules/firebase-admin/lib/app/index';
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index';
import { getAuth } from '../../functions/node_modules/firebase-admin/lib/auth/index';
import { getStorage } from '../../functions/node_modules/firebase-admin/lib/storage/index';
import type { CallableRequest } from '../../functions/node_modules/firebase-functions/lib/v2/providers/https';
import {
  FIREBASE_TEST_PROJECT_ID,
  assertDemoProjectId,
} from '../support/firebaseProject';

// Authentication is stubbed below; these tests exercise real Firestore commits.
// Avoid loading the Admin SDK's ESM-only JWKS dependency through Jest's CJS runner.
jest.mock('../../functions/node_modules/jwks-rsa', () => jest.fn());
jest.mock('../../functions/src/platformInfo', () => ({ PLATFORM_INFO: {} }), {
  virtual: true,
});

describe('member management authorization at commit time', () => {
  const projectId = assertDemoProjectId(FIREBASE_TEST_PROJECT_ID);
  const app = initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
  });
  const firestore = getFirestore(app);
  const deleteFiles = jest.fn(async () => undefined);
  let endpoints: typeof import('../../functions/src/index');
  const member = (role: number) => ({
    email: 'member@example.test',
    role,
    clubId: 'management-club',
    banned: false,
    agreedToTerms: true,
    termsVersion: '2026-08-28',
  });
  beforeAll(async () => {
    process.env.GCLOUD_PROJECT = projectId;
    process.env.FIREBASE_CONFIG = JSON.stringify({
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    });
    // Load after the demo app is initialized.
    endpoints = require('../../functions/src/index');
  });
  beforeEach(async () => {
    jest
      .spyOn(getAuth(app), 'verifyIdToken')
      .mockResolvedValue({ uid: 'manager', aud: projectId } as never);
    jest
      .spyOn(getAuth(app), 'getUser')
      .mockResolvedValue({ uid: 'manager', disabled: false } as never);
    jest.spyOn(getAuth(app), 'deleteUser').mockResolvedValue(undefined);
    deleteFiles.mockReset().mockResolvedValue(undefined);
    jest.spyOn(getStorage(app), 'bucket').mockReturnValue({
      deleteFiles,
      getFiles: jest.fn().mockResolvedValue([[]]),
    } as never);
    await firestore
      .doc('clubs/management-club')
      .set({ maintenanceMode: false, billingEnforcementEnabled: false });
    await firestore.doc('users/manager').set(member(2));
    await firestore.doc('users/managed-target').set(member(0));
    await firestore
      .doc('clubs/management-club/public-profiles/managed-target')
      .delete();
    await firestore.doc('account-deletion-jobs/manager').delete();
    await firestore.doc('account-deletion-jobs/managed-target').delete();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await deleteApp(app);
  });
  const request = (data: unknown) =>
    ({
      auth: { uid: 'manager' },
      data,
      rawRequest: { get: () => 'Bearer synthetic-token' },
    }) as unknown as CallableRequest<unknown>;
  const beforeCommit = (change: () => Promise<unknown>) => {
    const transact = firestore.runTransaction.bind(firestore);
    let changed = false;
    jest
      .spyOn(firestore, 'runTransaction')
      .mockImplementation(async (...args) => {
        if (!changed) {
          changed = true;
          await change();
        }
        return transact(...args);
      });
  };

  it('rejects a promotion when the acting Vice-President is demoted after the initial check', async () => {
    const transact = firestore.runTransaction.bind(firestore);
    let changed = false;
    jest
      .spyOn(firestore, 'runTransaction')
      .mockImplementation(async (...args) => {
        if (!changed) {
          changed = true;
          await firestore.doc('users/manager').update({ role: 0 });
        }
        return transact(...args);
      });
    await expect(
      endpoints.updateUserRole.run(
        request({ userId: 'managed-target', role: 1 }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(
      (await firestore.doc('users/managed-target').get()).data()?.role,
    ).toBe(0);
  });

  it('rejects a stale role change when its target becomes President before the transaction', async () => {
    const transact = firestore.runTransaction.bind(firestore);
    let changed = false;
    jest
      .spyOn(firestore, 'runTransaction')
      .mockImplementation(async (...args) => {
        if (!changed) {
          changed = true;
          await firestore.doc('users/managed-target').update({ role: 3 });
        }
        return transact(...args);
      });
    await expect(
      endpoints.updateUserRole.run(
        request({ userId: 'managed-target', role: 1 }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(
      (await firestore.doc('users/managed-target').get()).data()?.role,
    ).toBe(3);
  });

  it.each([
    ['actor ban', 'users/manager', { banned: true }],
    ['actor deletion', 'users/manager', { deletionPending: true }],
    ['terms withdrawal', 'users/manager', { agreedToTerms: false }],
    ['club suspension', 'clubs/management-club', { maintenanceMode: true }],
    ['target tenant change', 'users/managed-target', { clubId: 'other-club' }],
    ['target deletion', 'users/managed-target', { deletionPending: true }],
  ])('rechecks %s inside a role transaction', async (_name, path, patch) => {
    beforeCommit(() =>
      firestore.doc(path as string).update(patch as Record<string, unknown>),
    );
    await expect(
      endpoints.updateUserRole.run(
        request({ userId: 'managed-target', role: 1 }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(
      (await firestore.doc('users/managed-target').get()).data()?.role,
    ).toBe(0);
  });

  it('keeps an authorized promotion and its public role atomic', async () => {
    await expect(
      endpoints.updateUserRole.run(
        request({ userId: 'managed-target', role: 1 }),
      ),
    ).resolves.toEqual({ success: true });
    expect(
      (await firestore.doc('users/managed-target').get()).data()?.role,
    ).toBe(1);
    expect(
      (
        await firestore
          .doc('clubs/management-club/public-profiles/managed-target')
          .get()
      ).data()?.role,
    ).toBe(1);
  });

  it.each(['actor', 'target'])(
    'rejects managed deletion if the %s role changes before reservation',
    async (participant) => {
      beforeCommit(() =>
        firestore
          .doc(
            participant === 'actor' ? 'users/manager' : 'users/managed-target',
          )
          .update({ role: participant === 'actor' ? 0 : 3 }),
      );
      await expect(
        endpoints.removeManagedUser.run(request({ userId: 'managed-target' })),
      ).rejects.toMatchObject({ code: 'permission-denied' });
      expect(
        (await firestore.doc('account-deletion-jobs/managed-target').get())
          .exists,
      ).toBe(false);
      expect(getAuth(app).deleteUser).not.toHaveBeenCalled();
    },
  );

  it('rejects self-deletion when the account becomes President before reservation', async () => {
    beforeCommit(() => firestore.doc('users/manager').update({ role: 3 }));
    await expect(
      endpoints.deleteOwnAccount.run(
        request({ confirmation: 'member@example.test' }),
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(
      (await firestore.doc('account-deletion-jobs/manager').get()).exists,
    ).toBe(false);
    expect(getAuth(app).deleteUser).not.toHaveBeenCalled();
  });

  it.each(['notice', 'ban', 'unban'])(
    'rechecks the actor before committing a %s',
    async (action) => {
      if (action === 'unban') {
        await firestore.doc('users/managed-target').update({ banned: true });
        jest
          .spyOn(getAuth(app), 'revokeRefreshTokens')
          .mockResolvedValue(undefined);
        jest
          .spyOn(getAuth(app), 'updateUser')
          .mockResolvedValue({ uid: 'managed-target' } as never);
        jest
          .mocked(getAuth(app).getUser)
          .mockResolvedValue({
            uid: 'manager',
            disabled: false,
            tokensValidAfterTime: new Date().toISOString(),
          } as never);
      }
      beforeCommit(() => firestore.doc('users/manager').update({ role: 0 }));
      const result =
        action === 'notice'
          ? endpoints.addDisciplinaryNotice.run(
              request({ userId: 'managed-target', message: 'Notice' }),
            )
          : endpoints.setUserBanned.run(
              request({ userId: 'managed-target', banned: action === 'ban' }),
            );
      await expect(result).rejects.toMatchObject({ code: 'permission-denied' });
      expect(
        (await firestore.doc('users/managed-target').get()).data(),
      ).toMatchObject({ banned: action === 'unban' });
      expect(
        (await firestore.doc('users/managed-target').get()).data()
          ?.disciplinaryNotices,
      ).toBeUndefined();
    },
  );

  it('rechecks a successor whose deletion was reserved after the initial presidency check', async () => {
    await firestore.doc('users/manager').update({ role: 4 });
    await firestore.doc('users/managed-target').update({ role: 2 });
    beforeCommit(() =>
      firestore.doc('users/managed-target').update({ deletionPending: true }),
    );
    await expect(
      endpoints.transferPresidency.run(request({ userId: 'managed-target' })),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(
      (await firestore.doc('users/managed-target').get()).data()?.role,
    ).toBe(2);
  });

  it('rejects content callables for an account awaiting deletion', async () => {
    await firestore.doc('users/manager').update({ deletionPending: true });
    await expect(endpoints.createSurvey.run(request({}))).rejects.toMatchObject(
      { code: 'permission-denied' },
    );
  });

  it('blocks promotions and presidency transfers while deletion cleanup awaits a retry', async () => {
    await firestore.doc('users/manager').update({ role: 4 });
    await firestore.doc('users/managed-target').update({ role: 2 });
    deleteFiles.mockRejectedValueOnce(new Error('synthetic storage outage'));
    await expect(
      endpoints.removeManagedUser.run(request({ userId: 'managed-target' })),
    ).rejects.toMatchObject({ code: 'internal' });
    expect(
      (await firestore.doc('users/managed-target').get()).data()
        ?.deletionPending,
    ).toBe(true);
    await expect(
      endpoints.updateUserRole.run(
        request({ userId: 'managed-target', role: 1 }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(
      endpoints.transferPresidency.run(request({ userId: 'managed-target' })),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(getAuth(app).deleteUser).not.toHaveBeenCalled();
    await expect(
      endpoints.removeManagedUser.run(request({ userId: 'managed-target' })),
    ).resolves.toEqual({ success: true });
    expect(
      (await firestore.doc('account-deletion-jobs/managed-target').get()).data()
        ?.status,
    ).toBe('completed');
  });

  it('reports failed cleanup writes and retains anonymous-response receipts for retry', async () => {
    const receipt = firestore.doc(
      'clubs/management-club/survey-submission-receipts/anonymous-receipt',
    );
    const response = firestore.doc(
      'clubs/management-club/survey-responses/anonymous-response',
    );
    await receipt.set({ userId: 'manager', responseId: response.id });
    await response.set({ answers: [] });
    const createWriter = firestore.bulkWriter.bind(firestore);
    let fail = true;
    jest.spyOn(firestore, 'bulkWriter').mockImplementation((...args) => {
      const writer = createWriter(...args);
      const remove = writer.delete.bind(writer);
      jest.spyOn(writer, 'delete').mockImplementation((reference, ...rest) => {
        if (fail && reference.path === response.path) {
          fail = false;
          return Promise.reject(new Error('synthetic failed write'));
        }
        return remove(reference, ...rest);
      });
      return writer;
    });
    await expect(
      endpoints.deleteOwnAccount.run(
        request({ confirmation: 'member@example.test' }),
      ),
    ).rejects.toMatchObject({ code: 'internal' });
    expect(
      (await firestore.doc('users/manager').get()).data()?.deletionPending,
    ).toBe(true);
    expect((await receipt.get()).exists).toBe(true);
    expect((await response.get()).exists).toBe(true);
    expect(
      (await firestore.doc('account-deletion-jobs/manager').get()).data()
        ?.status,
    ).toBe('pending');
    expect(getAuth(app).deleteUser).not.toHaveBeenCalled();
    await expect(
      endpoints.deleteOwnAccount.run(
        request({ confirmation: 'member@example.test' }),
      ),
    ).resolves.toEqual({ success: true });
    expect(getAuth(app).deleteUser).toHaveBeenCalledWith('manager');
    expect((await receipt.get()).exists).toBe(false);
    expect((await response.get()).exists).toBe(false);
    expect(
      (await firestore.doc('account-deletion-jobs/manager').get()).data()
        ?.status,
    ).toBe('completed');
  });

  it('can retry Auth deletion after the private profile has already been removed', async () => {
    jest
      .mocked(getAuth(app).deleteUser)
      .mockRejectedValueOnce(new Error('synthetic Auth outage'));
    const input = request({ confirmation: 'member@example.test' });
    await expect(endpoints.deleteOwnAccount.run(input)).rejects.toMatchObject({
      code: 'internal',
    });
    expect((await firestore.doc('users/manager').get()).exists).toBe(false);
    expect(
      (await firestore.doc('account-deletion-jobs/manager').get()).data()
        ?.status,
    ).toBe('pending');
    await expect(endpoints.deleteOwnAccount.run(input)).resolves.toEqual({
      success: true,
    });
    expect(
      (await firestore.doc('account-deletion-jobs/manager').get()).data()
        ?.status,
    ).toBe('completed');
  });

  it('preserves concurrent moderation changes when removing notices authored by a deleted account', async () => {
    const target = firestore.doc('users/managed-target');
    const oldNotice = { id: 'old', issuedById: 'manager' };
    const newNotice = { id: 'new', issuedById: 'other-officer' };
    await target.update({ disciplinaryNotices: [oldNotice] });
    deleteFiles.mockImplementationOnce(async () => {
      await target.update({ disciplinaryNotices: [oldNotice, newNotice] });
    });
    const input = request({ confirmation: 'member@example.test' });
    await expect(endpoints.deleteOwnAccount.run(input)).rejects.toMatchObject({
      code: 'internal',
    });
    expect((await target.get()).data()?.disciplinaryNotices).toEqual([
      oldNotice,
      newNotice,
    ]);
    expect(getAuth(app).deleteUser).not.toHaveBeenCalled();
    await expect(endpoints.deleteOwnAccount.run(input)).resolves.toEqual({
      success: true,
    });
    expect((await target.get()).data()?.disciplinaryNotices).toEqual([
      newNotice,
    ]);
  });
});
