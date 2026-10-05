import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mutateRelationalCore } from './mutationGateway';
import type { ReadGatewayDependencies } from './readGateway';
const calls: unknown[] = [];
const deps: ReadGatewayDependencies = {
  enabled: true,
  firebaseProjectId: 'demo-test',
  authorizeLive: async () => ({
    clubId: 'real-club',
    firebaseProjectId: 'demo-test',
    role: 0,
    banned: false,
    authDisabled: false,
    clubAccessEnabled: true,
  }),
  rpc: async (name, params) => {
    calls.push({ name, params });
    return null;
  },
};
test('favorite mutations bind actor and role to live context, never client values', async () => {
  calls.length = 0;
  await mutateRelationalCore(
    'real-user',
    {
      operation: 'setCatalogFavorite',
      operationId: 'retry-key',
      catalogId: 'cat',
      userId: 'forged',
      role: 4,
      clubId: 'forged',
    },
    deps,
  );
  assert.deepEqual(calls, [
    {
      name: 'cc_set_catalog_favorite',
      params: {
        p_club: 'real-club',
        p_project: 'demo-test',
        p_user_id: 'real-user',
        p_role: 0,
        p_operation_id: 'retry-key',
        p_catalog_id: 'cat',
      },
    },
  ]);
});
test('revoked access, disabled rollout and invalid mutations stop before SQL', async () => {
  calls.length = 0;
  for (const input of [
    { operation: 'arbitrarySql' },
    { operation: 'setCatalogFavorite', operationId: '', catalogId: 'cat' },
    { operation: 'setCatalogFavorite', operationId: 'id', catalogId: '' },
  ])
    await assert.rejects(() => mutateRelationalCore('uid', input, deps));
  const input = {
    operation: 'setCatalogFavorite',
    operationId: 'id',
    catalogId: null,
  };
  await assert.rejects(() => mutateRelationalCore(undefined, input, deps));
  await assert.rejects(() =>
    mutateRelationalCore('uid', input, { ...deps, enabled: false }),
  );
  await assert.rejects(() =>
    mutateRelationalCore('uid', input, {
      ...deps,
      authorizeLive: async () => undefined,
    }),
  );
  assert.equal(calls.length, 0);
});
