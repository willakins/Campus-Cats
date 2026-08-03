import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  HandlerDependencies,
  HandlerError,
  ManagedUser,
  handleCreateWhitelistUser,
  handleRemoveManagedUser,
  handleSendAnnouncement,
  handleSendWhitelistEmail,
  handleSubmitWhitelistApplication,
  handleUpdateUserRole,
} from './handlers';

function buildDependencies(overrides: Partial<HandlerDependencies> = {}) {
  const users = new Map<string, ManagedUser>([
    ['member-1', { id: 'member-1', email: 'member@example.com', role: 0 }],
    ['admin-1', { id: 'admin-1', email: 'admin@example.com', role: 1 }],
    ['super-1', { id: 'super-1', email: 'super@example.com', role: 2 }],
  ]);
  const operations: string[] = [];
  const batches: number[] = [];
  const dependencies: HandlerDependencies = {
    async getUser(id) {
      return users.get(id);
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
    async sendWhitelistCredentials(email) {
      operations.push(`email:${email}`);
    },
    async findWhitelistByEmail() {
      return false;
    },
    async createWhitelistApplication() {
      return { created: true, id: 'application-1' };
    },
    ...overrides,
  };
  return { dependencies, users, operations, batches };
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
  it('authorizes announcements and batches distinct push tokens by 100', async () => {
    const tokens = Array.from({ length: 205 }, (_, index) => `token-${index}`);
    tokens.push('token-0');
    const { dependencies, batches } = buildDependencies({
      async listPushTokens() {
        return tokens;
      },
    });

    await rejectsWithCode(
      () =>
        handleSendAnnouncement(
          { data: { title: 'Update', message: 'Details' } },
          dependencies,
        ),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleSendAnnouncement(
          {
            authUid: 'member-1',
            data: { title: 'Update', message: 'Details' },
          },
          dependencies,
        ),
      'permission-denied',
    );
    const result = await handleSendAnnouncement(
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
      handleSendAnnouncement(
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

  it('enforces self, equal-role, and higher-role restrictions', async () => {
    const { dependencies, operations } = buildDependencies();
    await handleUpdateUserRole(
      { authUid: 'admin-1', data: { userId: 'member-1', role: 1 } },
      dependencies,
    );
    assert.deepEqual(operations, ['update-role:member-1:1']);
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
    assert.deepEqual(operations.slice(-2), [
      'delete-auth:admin-1',
      'delete-user:admin-1',
    ]);
  });

  it('validates and de-duplicates public whitelist submissions', async () => {
    const { dependencies } = buildDependencies();
    const created = await handleSubmitWhitelistApplication(
      {
        data: {
          name: 'Alex Applicant',
          graduationYear: '2025',
          email: 'Alex@Example.com',
          codeWord: '',
        },
      },
      dependencies,
    );
    assert.deepEqual(created, { status: 'created', id: 'application-1' });
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
});
