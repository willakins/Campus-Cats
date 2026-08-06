import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deleteAuthUserIfPresent } from './firebaseAuth';

describe('deleteAuthUserIfPresent', () => {
  it('deletes an existing Auth user', async () => {
    const deleted: string[] = [];

    await deleteAuthUserIfPresent(
      {
        async deleteUser(id) {
          deleted.push(id);
        },
      },
      'user-1',
    );

    assert.deepEqual(deleted, ['user-1']);
  });

  it('treats an already-missing Auth user as deleted', async () => {
    await assert.doesNotReject(() =>
      deleteAuthUserIfPresent(
        {
          async deleteUser() {
            throw Object.assign(new Error('User not found'), {
              code: 'auth/user-not-found',
            });
          },
        },
        'user-1',
      ),
    );
  });

  it('preserves unexpected Auth failures', async () => {
    const failure = Object.assign(new Error('Auth unavailable'), {
      code: 'auth/internal-error',
    });

    await assert.rejects(
      () =>
        deleteAuthUserIfPresent(
          {
            async deleteUser() {
              throw failure;
            },
          },
          'user-1',
        ),
      failure,
    );
  });
});
