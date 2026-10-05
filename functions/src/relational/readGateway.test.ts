import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readRelationalCore,
  createSupabaseRpc,
  LiveMemberAccess,
  ReadGatewayDependencies,
  SupabaseRpcError,
} from './readGateway';

const member: LiveMemberAccess = {
  clubId: 'authorized-club',
  firebaseProjectId: 'demo-test',
  role: 0,
  banned: false,
  authDisabled: false,
  clubAccessEnabled: true,
};
function dependencies(access: LiveMemberAccess | undefined = member) {
  const calls: unknown[] = [];
  const deps: ReadGatewayDependencies = {
    enabled: true,
    firebaseProjectId: 'demo-test',
    authorizeLive: async () => access,
    rpc: async (name, parameters) => {
      calls.push({ name, parameters });
      return [];
    },
  };
  return { deps, calls };
}
test('caller cannot select another club or an arbitrary SQL operation', async () => {
  const { deps, calls } = dependencies();
  await readRelationalCore(
    'uid',
    { operation: 'catalogPage', clubId: 'attacker-club', limit: 2 },
    deps,
  );
  assert.deepEqual(calls, [
    {
      name: 'cc_catalog_page',
      parameters: {
        p_club: 'authorized-club',
        p_project: 'demo-test',
        p_limit: 2,
      },
    },
  ]);
  await assert.rejects(
    () => readRelationalCore('uid', { operation: 'deleteTable' }, deps),
    /Unsupported/,
  );
});
test('missing authentication, configuration and live access all deny before SQL', async () => {
  const { deps, calls } = dependencies();
  await assert.rejects(
    () =>
      readRelationalCore(undefined, { operation: 'communitySummary' }, deps),
    /Sign in/,
  );
  await assert.rejects(
    () => readRelationalCore('uid', {}, { ...deps, enabled: false }),
    /not enabled/,
  );
  for (const denied of [
    undefined,
    { ...member, banned: true },
    { ...member, authDisabled: true },
    { ...member, clubAccessEnabled: false },
    { ...member, firebaseProjectId: 'different' },
  ]) {
    await assert.rejects(
      () =>
        readRelationalCore(
          'uid',
          { operation: 'communitySummary' },
          { ...deps, authorizeLive: async () => denied },
        ),
      /unavailable/,
    );
  }
  assert.equal(calls.length, 0);
});
test('bad bounds, excessive limits and incomplete cursors cannot reach SQL', async () => {
  const { deps, calls } = dependencies();
  for (const request of [
    { operation: 'catalogPage', limit: 1000 },
    { operation: 'catalogPage', afterName: 'cat' },
    {
      operation: 'catSightings',
      catalogId: 'cat',
      beforeDate: 'bad',
      beforeId: 'id',
    },
    { operation: 'sightingsInBounds', south: 5, north: 2, west: 0, east: 2 },
  ]) {
    await assert.rejects(() => readRelationalCore('uid', request, deps));
  }
  assert.equal(calls.length, 0);
});
test('server RPC accepts only hosted URLs and server secret keys', () => {
  assert.throws(
    () => createSupabaseRpc('http://localhost', 'sb_secret_example'),
    /hosted/,
  );
  assert.throws(
    () =>
      createSupabaseRpc('https://test.supabase.co', 'sb_publishable_example'),
    /server secret/,
  );
  assert.throws(
    () =>
      createSupabaseRpc(
        'https://test.supabase.co?secret=bad',
        'sb_secret_example',
      ),
    /hosted/,
  );
});

test('catalog discovery binds identity, filters and cursors to live server scope', async () => {
  const { deps, calls } = dependencies();
  const cursor = {
    name: 'cat',
    id: 'cat-id',
    metric: '123.123456',
    sort: 'recent',
    search: 'friendly',
    tagIds: ['female', 'feral'],
  };
  await readRelationalCore(
    'real-user',
    {
      operation: 'catalogDiscovery',
      userId: 'forged-user',
      clubId: 'forged-club',
      sort: 'recent',
      search: 'friendly',
      tagIds: ['female', 'feral', 'female'],
      cursor,
      limit: 41,
    },
    deps,
  );
  assert.deepEqual(calls, [
    {
      name: 'cc_catalog_discovery',
      parameters: {
        p_club: 'authorized-club',
        p_project: 'demo-test',
        p_user_id: 'real-user',
        p_sort: 'recent',
        p_search: 'friendly',
        p_tag_ids: ['female', 'feral'].sort(),
        p_limit: 41,
        p_after: { ...cursor, tagIds: ['female', 'feral'].sort() },
      },
    },
  ]);
  await assert.rejects(
    () =>
      readRelationalCore(
        'real-user',
        { operation: 'catalogDiscovery', sort: 'hearts', cursor },
        deps,
      ),
    /Cursor/,
  );
});

test('known SQL failures become safe errors without leaking upstream diagnostics', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: '55000',
          message: 'private-user-id secret-table',
          details: 'private data',
        }),
        { status: 400 },
      );
    const rpc = createSupabaseRpc(
      'https://test.supabase.co',
      'sb_secret_example',
    );
    await assert.rejects(
      () => rpc('cc_set_catalog_favorite', {}),
      (error) => {
        assert.ok(error instanceof SupabaseRpcError);
        assert.equal(error.code, 'failed-precondition');
        assert.ok(!error.message.includes('private'));
        return true;
      },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('catalog detail reads bind scope, counts bind caller, and media cursors are bounded', async () => {
  const { deps, calls } = dependencies();
  await readRelationalCore(
    'real-user',
    { operation: 'catalogRecord', catalogId: 'local', clubId: 'forged-club' },
    deps,
  );
  await readRelationalCore(
    'real-user',
    {
      operation: 'catalogFavoriteCounts',
      userId: 'forged-user',
      limit: 2,
      afterId: 'cat',
    },
    deps,
  );
  await readRelationalCore(
    'real-user',
    {
      operation: 'catalogMedia',
      catalogId: 'local',
      limit: 2,
      afterPosition: 0,
      afterId: 'photo',
    },
    deps,
  );
  assert.deepEqual(calls, [
    {
      name: 'cc_catalog_record',
      parameters: {
        p_club: member.clubId,
        p_project: 'demo-test',
        p_catalog_id: 'local',
      },
    },
    {
      name: 'cc_catalog_favorite_counts',
      parameters: {
        p_club: member.clubId,
        p_project: 'demo-test',
        p_user_id: 'real-user',
        p_limit: 2,
        p_after_id: 'cat',
      },
    },
    {
      name: 'cc_catalog_media_page',
      parameters: {
        p_club: member.clubId,
        p_project: 'demo-test',
        p_catalog_id: 'local',
        p_limit: 2,
        p_after_position: 0,
        p_after_id: 'photo',
      },
    },
  ]);
  for (const bad of [
    { operation: 'catalogMedia', catalogId: 'cat', afterId: 'photo' },
    {
      operation: 'catalogMedia',
      catalogId: 'cat',
      afterPosition: -1,
      afterId: 'photo',
    },
    {
      operation: 'catalogMedia',
      catalogId: 'cat',
      afterPosition: 2147483648,
      afterId: 'photo',
    },
    { operation: 'catalogFavoriteCounts', limit: 101 },
  ])
    await assert.rejects(() => readRelationalCore('real-user', bad, deps));
  assert.equal(calls.length, 3);
});

test('picker cursors retain long and empty database sort names', async () => {
  const { deps, calls } = dependencies();
  for (const name of ['a'.repeat(1000), '']) {
    await readRelationalCore(
      'uid',
      { operation: 'catalogPage', afterName: name, afterId: 'cat' },
      deps,
    );
    assert.deepEqual(calls.at(-1), {
      name: 'cc_catalog_page',
      parameters: {
        p_club: member.clubId,
        p_project: 'demo-test',
        p_limit: 40,
        p_after_name: name,
        p_after_id: 'cat',
      },
    });
  }
  await assert.rejects(() =>
    readRelationalCore(
      'uid',
      {
        operation: 'catalogPage',
        afterName: 'a'.repeat(1024 * 1024 + 1),
        afterId: 'cat',
      },
      deps,
    ),
  );
});
