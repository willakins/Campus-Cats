import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HandlerError, ManagedUser } from './handlers';
import {
  InaturalistHandlerDependencies,
  handleLinkInaturalistCatalog,
  handleModerateInaturalistRecord,
  handleRunInaturalistSync,
  handleUpdateInaturalistCatalog,
} from './inaturalistHandlers';

const users = new Map<string, ManagedUser>([
  ['member-1', { id: 'member-1', email: 'member@example.com', role: 0, clubId: 'campus-cats' }],
  ['admin-1', { id: 'admin-1', email: 'admin@example.com', role: 1, clubId: 'campus-cats' }],
]);

function dependencies() {
  const operations: unknown[] = [];
  const value: InaturalistHandlerDependencies = {
    async getUser(id) {
      return users.get(id);
    },
    async runSync() {
      operations.push('sync');
      return { status: 'success', runId: 'run-1' };
    },
    async moderate(kind, id, hidden, reason, actorId) {
      operations.push({ kind, id, hidden, reason, actorId });
    },
    async updateCatalogOverrides(id, overrides) {
      operations.push({ id, overrides });
    },
    async linkCatalog(id, localCatalogId) {
      operations.push({ id, localCatalogId });
    },
  };
  return { value, operations };
}

async function rejectsWithCode(
  operation: () => Promise<unknown>,
  code: HandlerError['code'],
) {
  await assert.rejects(
    operation,
    (error: unknown) => error instanceof HandlerError && error.code === code,
  );
}

describe('iNaturalist callable handlers', () => {
  it('allows only administrators to run a manual synchronization', async () => {
    const { value, operations } = dependencies();
    await rejectsWithCode(
      () => handleRunInaturalistSync({ data: {} }, value),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleRunInaturalistSync(
          { authUid: 'member-1', data: {} },
          value,
        ),
      'permission-denied',
    );

    assert.deepEqual(
      await handleRunInaturalistSync(
        { authUid: 'admin-1', data: {} },
        value,
      ),
      { status: 'success', runId: 'run-1' },
    );
    assert.deepEqual(operations, ['sync']);
  });

  it('validates and audits hide and restore operations', async () => {
    const { value, operations } = dependencies();
    await handleModerateInaturalistRecord(
      {
        authUid: 'admin-1',
        data: {
          kind: 'observation',
          id: 321,
          hidden: true,
          reason: 'Sensitive location',
        },
      },
      value,
    );
    assert.deepEqual(operations[0], {
      kind: 'observation',
      id: 321,
      hidden: true,
      reason: 'Sensitive location',
      actorId: 'admin-1',
    });
    await rejectsWithCode(
      () =>
        handleModerateInaturalistRecord(
          {
            authUid: 'admin-1',
            data: { kind: 'observation', id: 321, hidden: true, reason: '' },
          },
          value,
        ),
      'invalid-argument',
    );
  });

  it('allows only known catalog override fields and validates enums', async () => {
    const { value, operations } = dependencies();
    await handleUpdateInaturalistCatalog(
      {
        authUid: 'admin-1',
        data: {
          id: 2113386,
          overrides: {
            descLong: 'Locally maintained field notes.',
            currentStatus: 'Feral',
          },
        },
      },
      value,
    );
    assert.deepEqual(operations[0], {
      id: 2113386,
      overrides: {
        descLong: 'Locally maintained field notes.',
        currentStatus: 'Feral',
      },
    });
    await rejectsWithCode(
      () =>
        handleUpdateInaturalistCatalog(
          {
            authUid: 'admin-1',
            data: { id: 2113386, overrides: { role: 2 } },
          },
          value,
        ),
      'invalid-argument',
    );
  });

  it('links and unlinks imported catalog profiles explicitly', async () => {
    const { value, operations } = dependencies();
    await handleLinkInaturalistCatalog(
      {
        authUid: 'admin-1',
        data: { id: 2113386, localCatalogId: 'local-mimi' },
      },
      value,
    );
    await handleLinkInaturalistCatalog(
      {
        authUid: 'admin-1',
        data: { id: 2113386, localCatalogId: null },
      },
      value,
    );
    assert.deepEqual(operations, [
      { id: 2113386, localCatalogId: 'local-mimi' },
      { id: 2113386, localCatalogId: undefined },
    ]);
  });
});
