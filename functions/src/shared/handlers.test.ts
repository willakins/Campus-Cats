import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  HandlerDependencies,
  HandlerError,
  ManagedUser,
  handleAddDisciplinaryNotice,
  handleCreateWhitelistUser,
  handleDeleteOwnAccount,
  handleGetBillingSummary,
  handleMigrateContributorPrivacy,
  handleSelectProfileTitle,
  handleRemoveManagedUser,
  handleSendAlert,
  handleSendWhitelistEmail,
  handleSubmitWhitelistApplication,
  handleSetUserBanned,
  handleSyncPublicProfile,
  handleTransferPresidency,
  handleUpdateUserRole,
  handleUpdatePublicProfile,
} from './handlers';

function buildDependencies(overrides: Partial<HandlerDependencies> = {}) {
  const users = new Map<string, ManagedUser>([
    [
      'member-1',
      {
        id: 'member-1',
        email: 'member@example.com',
        role: 0,
        clubId: 'campus-cats',
        banned: false,
      },
    ],
    [
      'admin-1',
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 1,
        clubId: 'campus-cats',
        platformAdmin: true,
        banned: false,
      },
    ],
    [
      'super-1',
      {
        id: 'super-1',
        email: 'super@example.com',
        role: 2,
        clubId: 'campus-cats',
        banned: false,
      },
    ],
    [
      'president-1',
      {
        id: 'president-1',
        email: 'president@example.com',
        role: 3,
        clubId: 'campus-cats',
        banned: false,
      },
    ],
    [
      'developer-1',
      {
        id: 'developer-1',
        email: 'developer@example.com',
        role: 4,
        clubId: 'campus-cats',
        platformAdmin: false,
        banned: false,
      },
    ],
  ]);
  const operations: string[] = [];
  const pendingDeletions = new Map<string, ManagedUser>();
  const batches: number[] = [];
  const publicProfiles = new Map();
  const dependencies: HandlerDependencies = {
    async getUser(id) {
      return users.get(id);
    },
    async getAccountUser(id) {
      return users.get(id);
    },
    async getPendingAccountDeletion(id) {
      return pendingDeletions.get(id);
    },
    async prepareAccountDeletion(user) {
      operations.push(`prepare-deletion:${user.id}`);
      pendingDeletions.set(user.id, user);
    },
    async completeAccountDeletion(id) {
      operations.push(`complete-deletion:${id}`);
      pendingDeletions.delete(id);
    },
    async getDeveloper(id) {
      const user = users.get(id);
      return user?.role === 4 && !user.banned ? user : undefined;
    },
    async getBillingSummary() {
      return {
        status: 'ready',
        projectId: 'campuscats-d7a5e',
        exportProjectId: 'campuscats-d7a5e',
        datasetId: 'billing_export',
        generatedAt: '2026-08-05T12:00:00.000Z',
        months: [],
      };
    },
    async listPushTokens() {
      return [];
    },
    async sendPushBatch(messages) {
      batches.push(messages.length);
    },
    async createAuthUser(email) {
      operations.push(`create-auth:${email}`);
      return 'created-user';
    },
    async deleteAuthUser(id) {
      operations.push(`delete-auth:${id}`);
    },
    async putUser(user) {
      operations.push(`put-user:${user.id}`);
      users.set(user.id, user);
    },
    async deleteUser(id) {
      operations.push(`delete-user:${id}`);
      users.delete(id);
    },
    async updateUserRole(id, role) {
      operations.push(`update-role:${id}:${role}`);
    },
    async addDisciplinaryNotice(id, message, actor) {
      operations.push(`discipline:${id}:${message}:${actor.id}`);
    },
    async setUserBanned(id, banned, actor) {
      operations.push(`${banned ? 'ban' : 'unban'}:${id}:${actor.id}`);
      const target = users.get(id);
      if (target) users.set(id, { ...target, banned });
    },
    async transferPresidency(actorId, successorId) {
      operations.push(`transfer-presidency:${actorId}:${successorId}`);
      const actor = users.get(actorId);
      const successor = users.get(successorId);
      if (actor?.role === 3) users.set(actorId, { ...actor, role: 1 });
      if (successor) users.set(successorId, { ...successor, role: 3 });
    },
    async sendWhitelistCredentials(email) {
      operations.push(`email:${email}`);
    },
    async consumeWhitelistQuota() {},
    async findWhitelistByEmail() {
      return false;
    },
    async createWhitelistApplication() {
      return { created: true, id: 'application-1' };
    },
    async getPublicProfile(id) {
      return publicProfiles.get(id);
    },
    async putPublicProfile(profile) {
      publicProfiles.set(profile.id, profile);
      operations.push(`put-profile:${profile.id}`);
      return profile;
    },
    async countUserSightings() {
      return 0;
    },
    async verifyProfilePhoto() {
      return true;
    },
    async migrateContributorPrivacy() {
      operations.push('migrate-contributor-privacy');
      return { sightings: 0, catalog: 0 };
    },
    ...overrides,
  };
  return { dependencies, users, publicProfiles, operations, batches };
}

async function rejectsWithCode(
  operation: () => Promise<unknown>,
  code: HandlerError['code'],
): Promise<void> {
  await assert.rejects(
    operation,
    (error: unknown) => error instanceof HandlerError && error.code === code,
  );
}

describe('callable handlers', () => {
  it('restricts infrastructure billing data to Developers', async () => {
    const { dependencies } = buildDependencies();

    await rejectsWithCode(
      () => handleGetBillingSummary({ data: {} }, dependencies),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleGetBillingSummary(
          { authUid: 'member-1', data: {} },
          dependencies,
        ),
      'permission-denied',
    );
    await rejectsWithCode(
      () =>
        handleGetBillingSummary({ authUid: 'admin-1', data: {} }, dependencies),
      'permission-denied',
    );
    assert.equal(
      (
        await handleGetBillingSummary(
          { authUid: 'developer-1', data: {} },
          dependencies,
        )
      ).status,
      'ready',
    );
  });

  it('restricts contributor privacy migration to President-level roles', async () => {
    const { dependencies, operations } = buildDependencies();

    await rejectsWithCode(
      () => handleMigrateContributorPrivacy({ data: {} }, dependencies),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleMigrateContributorPrivacy(
          { authUid: 'admin-1', data: {} },
          dependencies,
        ),
      'permission-denied',
    );
    assert.deepEqual(
      await handleMigrateContributorPrivacy(
        { authUid: 'president-1', data: {} },
        dependencies,
      ),
      { sightings: 0, catalog: 0 },
    );
    assert.deepEqual(
      await handleMigrateContributorPrivacy(
        { authUid: 'developer-1', data: {} },
        dependencies,
      ),
      { sightings: 0, catalog: 0 },
    );
    assert.deepEqual(operations, [
      'migrate-contributor-privacy',
      'migrate-contributor-privacy',
    ]);
  });

  it('authorizes alerts and batches distinct push tokens by 100', async () => {
    const tokens = Array.from({ length: 205 }, (_, index) => `token-${index}`);
    tokens.push('token-0');
    const { dependencies, batches } = buildDependencies({
      async listPushTokens() {
        return tokens;
      },
    });

    await rejectsWithCode(
      () =>
        handleSendAlert(
          { data: { title: 'Update', message: 'Details' } },
          dependencies,
        ),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleSendAlert(
          {
            authUid: 'member-1',
            data: { title: 'Update', message: 'Details' },
          },
          dependencies,
        ),
      'permission-denied',
    );
    const result = await handleSendAlert(
      {
        authUid: 'admin-1',
        data: { title: 'Update', message: 'Details' },
      },
      dependencies,
    );
    assert.deepEqual(result, { success: true, sent: 205 });
    assert.deepEqual(batches, [100, 100, 5]);
  });

  it('surfaces push-provider failures', async () => {
    const { dependencies } = buildDependencies({
      async listPushTokens() {
        return ['token-1'];
      },
      async sendPushBatch() {
        throw new Error('provider unavailable');
      },
    });
    await assert.rejects(() =>
      handleSendAlert(
        {
          authUid: 'admin-1',
          data: { title: 'Update', message: 'Details' },
        },
        dependencies,
      ),
    );
  });

  it('creates whitelist users in Auth before profiles and compensates profile failure', async () => {
    const successful = buildDependencies();
    const result = await handleCreateWhitelistUser(
      {
        authUid: 'admin-1',
        data: { email: 'new@example.com', password: 'temporary-password' },
      },
      successful.dependencies,
    );
    assert.deepEqual(result, { success: true, uid: 'created-user' });
    assert.deepEqual(successful.operations, [
      'create-auth:new@example.com',
      'put-user:created-user',
    ]);

    const failed = buildDependencies({
      async putUser() {
        throw new Error('Firestore unavailable');
      },
    });
    await assert.rejects(() =>
      handleCreateWhitelistUser(
        {
          authUid: 'admin-1',
          data: { email: 'new@example.com', password: 'temporary-password' },
        },
        failed.dependencies,
      ),
    );
    assert.deepEqual(failed.operations, [
      'create-auth:new@example.com',
      'delete-auth:created-user',
    ]);
  });

  it('enforces the explicit promotion and demotion matrix', async () => {
    const { dependencies, operations } = buildDependencies();
    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'admin-1', data: { userId: 'member-1', role: 1 } },
          dependencies,
        ),
      'permission-denied',
    );

    await handleUpdateUserRole(
      { authUid: 'super-1', data: { userId: 'member-1', role: 1 } },
      dependencies,
    );
    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'super-1', data: { userId: 'admin-1', role: 2 } },
          dependencies,
        ),
      'permission-denied',
    );

    await handleUpdateUserRole(
      { authUid: 'president-1', data: { userId: 'admin-1', role: 2 } },
      dependencies,
    );
    await handleUpdateUserRole(
      { authUid: 'developer-1', data: { userId: 'admin-1', role: 2 } },
      dependencies,
    );
    await handleUpdateUserRole(
      { authUid: 'super-1', data: { userId: 'admin-1', role: 0 } },
      dependencies,
    );
    await handleUpdateUserRole(
      { authUid: 'president-1', data: { userId: 'super-1', role: 1 } },
      dependencies,
    );
    await handleUpdateUserRole(
      { authUid: 'developer-1', data: { userId: 'super-1', role: 1 } },
      dependencies,
    );

    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'developer-1', data: { userId: 'member-1', role: 2 } },
          dependencies,
        ),
      'permission-denied',
    );
    assert.deepEqual(operations, [
      'update-role:member-1:1',
      'update-role:admin-1:2',
      'update-role:admin-1:2',
      'update-role:admin-1:0',
      'update-role:super-1:1',
      'update-role:super-1:1',
    ]);
  });

  it('enforces self, equal-role, protected-role, and role-value restrictions', async () => {
    const { dependencies, operations } = buildDependencies();
    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'admin-1', data: { userId: 'admin-1', role: 0 } },
          dependencies,
        ),
      'permission-denied',
    );
    await rejectsWithCode(
      () =>
        handleRemoveManagedUser(
          { authUid: 'admin-1', data: { userId: 'super-1' } },
          dependencies,
        ),
      'permission-denied',
    );
    await handleRemoveManagedUser(
      { authUid: 'super-1', data: { userId: 'admin-1' } },
      dependencies,
    );
    assert.deepEqual(operations.slice(-4), [
      'prepare-deletion:admin-1',
      'delete-user:admin-1',
      'delete-auth:admin-1',
      'complete-deletion:admin-1',
    ]);
    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'super-1', data: { userId: 'member-1', role: 3 } },
          dependencies,
        ),
      'invalid-argument',
    );
    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'developer-1', data: { userId: 'member-1', role: 4 } },
          dependencies,
        ),
      'invalid-argument',
    );
  });

  it('lets a signed-in non-President permanently delete their own account', async () => {
    const { dependencies, users, operations } = buildDependencies();

    await rejectsWithCode(
      () =>
        handleDeleteOwnAccount(
          { data: { confirmation: 'member@example.com' } },
          dependencies,
        ),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleDeleteOwnAccount(
          { authUid: 'member-1', data: { confirmation: 'wrong@example.com' } },
          dependencies,
        ),
      'invalid-argument',
    );
    await rejectsWithCode(
      () =>
        handleDeleteOwnAccount(
          {
            authUid: 'president-1',
            data: { confirmation: 'president@example.com' },
          },
          dependencies,
        ),
      'failed-precondition',
    );

    assert.deepEqual(
      await handleDeleteOwnAccount(
        { authUid: 'member-1', data: { confirmation: ' MEMBER@example.com ' } },
        dependencies,
      ),
      { success: true },
    );
    assert.equal(users.has('member-1'), false);
    assert.deepEqual(operations.slice(-4), [
      'prepare-deletion:member-1',
      'delete-user:member-1',
      'delete-auth:member-1',
      'complete-deletion:member-1',
    ]);
  });

  it('can retry self-deletion after cleanup removed the account profile', async () => {
    let failAuthDeletion = true;
    const context = buildDependencies({
      async deleteAuthUser(id) {
        context.operations.push(`delete-auth:${id}`);
        if (failAuthDeletion) {
          failAuthDeletion = false;
          throw new Error('temporary auth failure');
        }
      },
    });
    const request = {
      authUid: 'member-1',
      data: { confirmation: 'member@example.com' },
    };

    await assert.rejects(() =>
      handleDeleteOwnAccount(request, context.dependencies),
    );
    assert.equal(context.users.has('member-1'), false);

    assert.deepEqual(
      await handleDeleteOwnAccount(request, context.dependencies),
      { success: true },
    );
    assert.equal(
      context.operations.filter(
        (operation) => operation === 'delete-auth:member-1',
      ).length,
      2,
    );
  });

  it('allows every power role to discipline, ban, and unban members only', async () => {
    const { dependencies, operations } = buildDependencies();

    for (const authUid of [
      'admin-1',
      'super-1',
      'president-1',
      'developer-1',
    ]) {
      await handleAddDisciplinaryNotice(
        {
          authUid,
          data: {
            userId: 'member-1',
            message: 'Posted an inappropriate image',
          },
        },
        dependencies,
      );
    }
    await handleSetUserBanned(
      { authUid: 'admin-1', data: { userId: 'member-1', banned: true } },
      dependencies,
    );
    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'super-1', data: { userId: 'member-1', role: 1 } },
          dependencies,
        ),
      'permission-denied',
    );
    await handleSetUserBanned(
      { authUid: 'super-1', data: { userId: 'member-1', banned: false } },
      dependencies,
    );

    assert.deepEqual(operations, [
      'discipline:member-1:Posted an inappropriate image:admin-1',
      'discipline:member-1:Posted an inappropriate image:super-1',
      'discipline:member-1:Posted an inappropriate image:president-1',
      'discipline:member-1:Posted an inappropriate image:developer-1',
      'ban:member-1:admin-1',
      'unban:member-1:super-1',
    ]);

    await rejectsWithCode(
      () =>
        handleSetUserBanned(
          { authUid: 'member-1', data: { userId: 'member-1', banned: true } },
          dependencies,
        ),
      'permission-denied',
    );
    await rejectsWithCode(
      () =>
        handleSetUserBanned(
          { authUid: 'developer-1', data: { userId: 'admin-1', banned: true } },
          dependencies,
        ),
      'permission-denied',
    );
    await rejectsWithCode(
      () =>
        handleAddDisciplinaryNotice(
          { authUid: 'admin-1', data: { userId: 'super-1', message: 'No' } },
          dependencies,
        ),
      'permission-denied',
    );
    await rejectsWithCode(
      () =>
        handleAddDisciplinaryNotice(
          {
            authUid: 'admin-1',
            data: { userId: 'member-1', message: ' '.repeat(2) },
          },
          dependencies,
        ),
      'invalid-argument',
    );
  });

  it('uses a dedicated presidential succession workflow', async () => {
    const { dependencies, users, operations } = buildDependencies();

    await handleTransferPresidency(
      { authUid: 'president-1', data: { userId: 'super-1' } },
      dependencies,
    );
    assert.equal(users.get('president-1')?.role, 1);
    assert.equal(users.get('super-1')?.role, 3);
    assert.equal(operations.at(-1), 'transfer-presidency:president-1:super-1');

    await rejectsWithCode(
      () =>
        handleTransferPresidency(
          { authUid: 'admin-1', data: { userId: 'member-1' } },
          dependencies,
        ),
      'invalid-argument',
    );
    await rejectsWithCode(
      () =>
        handleUpdateUserRole(
          { authUid: 'developer-1', data: { userId: 'member-1', role: 3 } },
          dependencies,
        ),
      'invalid-argument',
    );
  });

  it('validates and de-duplicates public whitelist submissions', async () => {
    const selectedClubs: string[] = [];
    const { dependencies } = buildDependencies({
      async findWhitelistByEmail(_email, clubId) {
        selectedClubs.push(`find:${clubId}`);
        return false;
      },
      async createWhitelistApplication(_application, clubId) {
        selectedClubs.push(`create:${clubId}`);
        return { created: true, id: 'application-1' };
      },
    });
    const created = await handleSubmitWhitelistApplication(
      {
        data: {
          clubId: 'club-139658',
          name: 'Alex Applicant',
          email: 'Alex@Example.com',
          codeWord: '',
        },
      },
      dependencies,
    );
    assert.deepEqual(created, { status: 'created', id: 'application-1' });
    assert.deepEqual(selectedClubs, ['find:club-139658', 'create:club-139658']);
    await rejectsWithCode(
      () =>
        handleSubmitWhitelistApplication(
          {
            data: {
              name: '',
              graduationYear: '2025',
              email: 'not-an-email',
              codeWord: '',
            },
          },
          dependencies,
        ),
      'invalid-argument',
    );

    const duplicate = buildDependencies({
      async findWhitelistByEmail() {
        return true;
      },
    });
    assert.deepEqual(
      await handleSubmitWhitelistApplication(
        {
          data: {
            name: 'Alex Applicant',
            graduationYear: '2025',
            email: 'alex@example.com',
            codeWord: '',
          },
        },
        duplicate.dependencies,
      ),
      { status: 'conflict' },
    );
  });

  it('rejects a rate-limited public application before querying or writing applications', async () => {
    const checks: string[] = [];
    const dependencies = {
      ...buildDependencies().dependencies,
      async consumeWhitelistQuota(ip: string | undefined, email: string) {
        checks.push(`${ip}:${email}`);
        throw new Error('Application limit reached');
      },
      async findWhitelistByEmail() { throw new Error('Application lookup must not run'); },
      async createWhitelistApplication() { throw new Error('Application write must not run'); },
    };
    const request = { clientIp: '192.0.2.10', data: {
      name: 'Alex', email: 'Alex@Example.com', clientIp: '198.51.100.1',
    } };
    await assert.rejects(handleSubmitWhitelistApplication(request, dependencies), /Application limit reached/);
    assert.deepEqual(checks, ['192.0.2.10:alex@example.com']);
  });

  it('authorizes and propagates whitelist email provider failures', async () => {
    const { dependencies } = buildDependencies({
      async sendWhitelistCredentials() {
        throw new Error('SendGrid unavailable');
      },
    });
    await rejectsWithCode(
      () =>
        handleSendWhitelistEmail(
          {
            authUid: 'member-1',
            data: { email: 'new@example.com', password: 'temporary' },
          },
          dependencies,
        ),
      'permission-denied',
    );
    await assert.rejects(() =>
      handleSendWhitelistEmail(
        {
          authUid: 'admin-1',
          data: { email: 'new@example.com', password: 'temporary' },
        },
        dependencies,
      ),
    );
  });

  it('creates public profiles and permanently unlocks progress achievements', async () => {
    const { dependencies, publicProfiles } = buildDependencies({
      async countUserSightings() {
        return 10;
      },
    });

    const synced = await handleSyncPublicProfile(
      { authUid: 'member-1', data: {} },
      dependencies,
    );
    assert.equal(synced.displayName, 'member');
    assert.deepEqual(synced.achievementIds, [
      'first-sighting',
      'ten-sightings',
    ]);

    await handleUpdatePublicProfile(
      {
        authUid: 'member-1',
        data: {
          displayName: 'Cat Watcher',
          bio: 'I watch the Tech Tower cats.',
          profilePhotoUrl:
            'https://firebasestorage.googleapis.com/v0/b/test/o/public-profiles%2Fmember-1%2Fprofile.jpg',
        },
      },
      dependencies,
    );
    assert.deepEqual(publicProfiles.get('member-1')?.achievementIds, [
      'profile-photo',
      'first-sighting',
      'ten-sightings',
    ]);

    await handleSyncPublicProfile(
      { authUid: 'president-1', data: {} },
      dependencies,
    );
    assert.deepEqual(publicProfiles.get('president-1')?.achievementIds, [
      'president',
      'first-sighting',
      'ten-sightings',
    ]);
  });

  it('allows one displayed title only after its achievement is unlocked', async () => {
    const { dependencies, publicProfiles } = buildDependencies({
      async countUserSightings() {
        return 1;
      },
    });
    await handleSyncPublicProfile(
      { authUid: 'member-1', data: {} },
      dependencies,
    );

    const selected = await handleSelectProfileTitle(
      {
        authUid: 'member-1',
        data: { achievementId: 'first-sighting' },
      },
      dependencies,
    );
    assert.equal(selected.selectedTitleId, 'first-sighting');

    await rejectsWithCode(
      () =>
        handleSelectProfileTitle(
          {
            authUid: 'member-1',
            data: { achievementId: 'hundred-sightings' },
          },
          dependencies,
        ),
      'permission-denied',
    );
    await handleSelectProfileTitle(
      { authUid: 'member-1', data: { achievementId: '' } },
      dependencies,
    );
    assert.equal(publicProfiles.get('member-1')?.selectedTitleId, '');
  });

  it('validates public profile fields and denies banned accounts', async () => {
    const { dependencies } = buildDependencies();
    await rejectsWithCode(
      () =>
        handleUpdatePublicProfile(
          {
            authUid: 'member-1',
            data: {
              displayName: '',
              bio: '',
              profilePhotoUrl: 'javascript:alert(1)',
            },
          },
          dependencies,
        ),
      'invalid-argument',
    );
    await handleSetUserBanned(
      { authUid: 'admin-1', data: { userId: 'member-1', banned: true } },
      dependencies,
    );
    await rejectsWithCode(
      () =>
        handleSyncPublicProfile(
          { authUid: 'member-1', data: {} },
          dependencies,
        ),
      'permission-denied',
    );
  });

  it('rejects a profile-photo URL without an owned Storage object', async () => {
    const { dependencies } = buildDependencies({
      async verifyProfilePhoto() {
        return false;
      },
    });

    await rejectsWithCode(
      () =>
        handleUpdatePublicProfile(
          {
            authUid: 'member-1',
            data: {
              displayName: 'Cat Watcher',
              bio: '',
              profilePhotoUrl:
                'https://firebasestorage.googleapis.com/v0/b/test/o/public-profiles%2Fmember-1%2Ffake.jpg',
            },
          },
          dependencies,
        ),
      'invalid-argument',
    );
  });
});


describe('untrusted text at callable boundaries', () => {
  it('rejects oversized or malformed membership applications before persistence', async () => {
    for (const patch of [
      { name: 'x'.repeat(201) }, { graduationYear: 'x'.repeat(21) },
      { codeWord: 'x'.repeat(201) }, { name: 'bad\u0000name' },
      { email: 'a@example.com\r\nBcc: b@example.com' },
    ]) {
      let persisted = false;
      const dependencies = buildDependencies({
        createWhitelistApplication: async () => { persisted = true; return { created: true, id: 'id' }; },
      });
      await assert.rejects(handleSubmitWhitelistApplication({ data: {
        name: 'Alex', email: 'alex@example.com', ...patch,
      } }, dependencies.dependencies), { code: 'invalid-argument' });
      assert.equal(persisted, false);
    }
  });
});
