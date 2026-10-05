#!/usr/bin/env node
'use strict';
// Read-only hosted verification. Prints aggregate counts, timings and pass/fail only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { argumentsFor } = require('./export-firestore.cjs');
const { execFileSync } = require('node:child_process');
const {
  connectionEnvironment,
  describeDatabaseFailure,
} = require('./hosted.cjs');

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  const projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  const environment = connectionEnvironment(process.env, projectRef);
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../../supabase/source-manifest.production.json'),
      'utf8',
    ),
  );
  assert.equal(
    manifest.project,
    environment.SUPABASE_FIREBASE_PROJECT_ID,
    'Source project mismatch',
  );
  const club = manifest.club;
  const query = (sql) =>
    execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'], {
      env: environment,
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    })
      .toString()
      .trim();
  query(`begin read only;
    do $$ begin
      if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname in ('app','app_private') and c.relkind='r' and not c.relrowsecurity) then
        raise exception 'Application table without RLS';
      end if;
      if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname like 'cc_%'
          and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))) then
        raise exception 'Client can execute service RPC';
      end if;
    end $$;
    set local role anon;
    do $$ begin
      begin perform * from app_private.contributors; raise exception 'Anonymous contributor access';
      exception when insufficient_privilege then null; end;
    end $$;
    reset role;
    set local role authenticated;
    do $$ begin
      begin perform * from app_private.vote_receipts; raise exception 'Authenticated ballot identity access';
      exception when insufficient_privilege then null; end;
      begin perform * from app.sightings; raise exception 'Direct client table access';
      exception when insufficient_privilege then null; end;
    end $$;
    reset role;
    commit;`);
  const capacity = JSON.parse(
    query(fs.readFileSync(path.join(__dirname, 'capacity.sql'), 'utf8')),
  );
  assert.equal(
    capacity.memberships_enabled,
    0,
    'Rehearsal dataset must have no enabled memberships',
  );
  assert.equal(
    Number(query('select count(*) from app_private.outbox;')),
    0,
    'Import generated user activity',
  );
  const base = { p_club: club, p_project: manifest.project };
  const timings = {};
  async function rpc(name, parameters) {
    const start = performance.now();
    const response = await fetch(
      new URL(`/rest/v1/rpc/${name}`, process.env.SUPABASE_URL),
      {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parameters),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new Error(
        `RPC verification failed (${response.status}) for ${name}`,
      );
    // Keep every sample; isolation/empty-page checks have different work from the first data page.
    if (!timings[name]) timings[name] = [];
    timings[name].push(Math.round(performance.now() - start));
    return response.json();
  }
  const first = await rpc('cc_catalog_page', { ...base, p_limit: 5 });
  assert.ok(first.length > 0 && first.length <= 5);
  for (const row of first) {
    assert.equal(row.club_id, club);
    for (const field of [
      'createdBy',
      'created_by',
      'email',
      'contributor_id',
      'user_id',
    ])
      assert.ok(!(field in row), 'Private contributor field leaked');
  }
  const last = first.at(-1);
  const next = await rpc('cc_catalog_page', {
    ...base,
    p_limit: 5,
    p_after_name: last.sort_name,
    p_after_id: last.id,
  });
  assert.ok(
    next.every((row) => !first.some((previous) => previous.id === row.id)),
    'Catalog pagination duplicated rows',
  );
  assert.deepEqual(
    await rpc('cc_catalog_page', {
      ...base,
      p_club: 'missing-club',
      p_limit: 5,
    }),
    [],
  );
  assert.deepEqual(
    await rpc('cc_catalog_page', {
      ...base,
      p_project: 'missing-project',
      p_limit: 5,
    }),
    [],
  );
  const sightings = await rpc('cc_sightings_in_bounds', {
    ...base,
    p_south: -90,
    p_north: 90,
    p_west: -180,
    p_east: 180,
    p_limit: 5,
  });
  assert.ok(sightings.length > 0 && sightings.length <= 5);
  assert.ok(sightings.every((row) => row.club_id === club));
  await rpc('cc_cat_sightings', {
    ...base,
    p_catalog_id: first[0].id,
    p_limit: 5,
  });
  const summary = await rpc('cc_community_summary', base);
  assert.equal(typeof summary.alerts, 'number');
  const profileUid = query(
    'select user_id from app.profiles order by user_id limit 1;',
  );
  const discoveryBase = { ...base, p_user_id: profileUid };
  for (const sort of [
    'name-asc',
    'name-desc',
    'sightings',
    'recent',
    'hearts',
  ]) {
    const page = await rpc('cc_catalog_discovery', {
      ...discoveryBase,
      p_sort: sort,
      p_limit: 5,
    });
    assert.equal(page.total, capacity.effective_catalog_entries);
    assert.equal(page.items.length, 5);
    const nextPage = await rpc('cc_catalog_discovery', {
      ...discoveryBase,
      p_sort: sort,
      p_limit: 5,
      p_after: page.items.at(-1).cursor,
    });
    assert.ok(
      nextPage.items.every(
        (row) => !page.items.some((previous) => previous.id === row.id),
      ),
      'Catalog discovery pagination duplicated rows',
    );
    for (const row of [...page.items, ...nextPage.items]) {
      assert.equal(row.club_id, club);
      assert.ok(
        !('user_id' in row) && !('created_by' in row) && !('email' in row),
        'Catalog card exposed private identity',
      );
      assert.ok(row.cover === null || row.cover.role === 'profile');
      assert.ok(Array.isArray(row.tags));
    }
  }
  const isolatedDiscovery = await rpc('cc_catalog_discovery', {
    ...discoveryBase,
    p_project: 'missing-project',
  });
  assert.equal(isolatedDiscovery.total, 0);
  const detail = await rpc('cc_catalog_record', {
    ...base,
    p_catalog_id: first[0].id,
  });
  assert.equal(detail.id, first[0].id);
  for (const field of ['user_id', 'created_by', 'email', 'contributor_id'])
    assert.ok(!(field in detail), 'Catalog detail exposed private identity');
  assert.equal(
    await rpc('cc_catalog_record', {
      ...base,
      p_project: 'missing-project',
      p_catalog_id: first[0].id,
    }),
    null,
  );
  const media = await rpc('cc_catalog_media_page', {
    ...base,
    p_catalog_id: first[0].id,
    p_limit: 2,
  });
  assert.ok(media.length <= 2);
  for (const row of media) {
    assert.ok(['firebase', 'external'].includes(row.kind));
    assert.ok(['profile', 'gallery'].includes(row.role));
    assert.ok(typeof row.url === 'string' && typeof row.metadata === 'object');
    assert.ok(!('user_id' in row) && !('owner_id' in row));
  }
  if (media.length) {
    const lastMedia = media.at(-1);
    const nextMedia = await rpc('cc_catalog_media_page', {
      ...base,
      p_catalog_id: first[0].id,
      p_limit: 2,
      p_after_position: lastMedia.position,
      p_after_id: lastMedia.id,
    });
    assert.ok(
      nextMedia.every(
        (row) => !media.some((previous) => row.id === previous.id),
      ),
      'Media pagination duplicated rows',
    );
  }
  assert.deepEqual(
    await rpc('cc_catalog_media_page', {
      ...base,
      p_project: 'missing-project',
      p_catalog_id: first[0].id,
    }),
    [],
  );
  const favoriteCounts = await rpc('cc_catalog_favorite_counts', {
    ...base,
    p_user_id: profileUid,
    p_limit: 2,
  });
  assert.ok(favoriteCounts.items.length <= 2);
  assert.ok(
    favoriteCounts.items.every(
      (row) => typeof row.heart_count === 'number' && !('user_id' in row),
    ),
  );
  assert.deepEqual(
    await rpc('cc_catalog_favorite_counts', {
      ...base,
      p_project: 'missing-project',
      p_user_id: profileUid,
    }),
    { items: [], selected_catalog_id: null },
  );
  const favorite = await rpc('cc_catalog_favorite', {
    ...base,
    p_user_id: profileUid,
  });
  assert.ok(
    favorite === null ||
      (favorite.user_id === profileUid && !('email' in favorite)),
  );
  assert.equal(
    await rpc('cc_catalog_favorite', {
      ...base,
      p_project: 'missing-project',
      p_user_id: profileUid,
    }),
    null,
  );
  query(`begin read only; do $$ begin
    if exists(select 1 from app_private.domain_backends where backend='postgres') then
      raise exception 'Rehearsal has a live SQL writer'; end if;
    end $$; commit;`);
  const profile = await rpc('cc_member_profile', {
    ...base,
    p_user_id: profileUid,
  });
  assert.equal(profile.user_id, profileUid);
  assert.ok(!('email' in profile));
  const denied = await fetch(
    new URL('/rest/v1/rpc/cc_catalog_page', process.env.SUPABASE_URL),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(base),
      signal: AbortSignal.timeout(15000),
    },
  );
  assert.equal(denied.status, 401, 'Unauthenticated API request was accepted');
  const privateSchema = await fetch(
    new URL('/rest/v1/contributors?limit=1', process.env.SUPABASE_URL),
    {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY,
        'Accept-Profile': 'app_private',
      },
      signal: AbortSignal.timeout(15000),
    },
  );
  assert.equal(
    privateSchema.status,
    406,
    'Private schema exposed in the Data API',
  );
  const report = JSON.stringify(
    {
      projectRef,
      verifiedAt: new Date().toISOString(),
      capacity,
      rlsAndClientGrantsVerified: true,
      apiQueriesVerified: true,
      paginationVerified: true,
      projectAndClubIsolationVerified: true,
      privateSchemaUnexposed: true,
      catalogDiscoveryVerified: true,
      catalogDetailsVerified: true,
      sqlWritesRemainDisabled: true,
      rpcRoundTripMilliseconds: timings,
    },
    null,
    2,
  );
  // Preserve the last successful evidence if a subsequent verification fails.
  if (args.output) {
    const target = path.resolve(args.output),
      temporary = target + '.tmp';
    fs.writeFileSync(temporary, report + '\n');
    fs.renameSync(temporary, target);
  }
  console.log(report);
}
if (require.main === module)
  main().catch((error) => {
    console.error(
      error.status !== undefined
        ? describeDatabaseFailure(error)
        : error.message,
    );
    process.exitCode = 1;
  });
