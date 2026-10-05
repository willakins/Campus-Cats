const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  connectionEnvironment,
  schemaSql,
  describeDatabaseFailure,
  rehearsalSql,
} = require('./hosted.cjs');
const { fixture } = require('./migration-fixture.cjs');

test('connection configuration pins the target project and keeps credentials out of argv', () => {
  const env = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
    SUPABASE_DB_URL:
      'postgresql://postgres.example:a%24b@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require',
    SUPABASE_FIREBASE_PROJECT_ID: 'demo-test',
  };
  assert.equal(connectionEnvironment(env, 'example').PGPASSWORD, 'a$b');
  const direct = {
    ...env,
    SUPABASE_DB_URL:
      'postgresql://postgres:a%24b@db.example.supabase.co:5432/postgres?sslmode=require',
  };
  assert.equal(
    connectionEnvironment(direct, 'example').PGHOST,
    'db.example.supabase.co',
  );
  assert.throws(
    () =>
      connectionEnvironment(
        {
          ...direct,
          SUPABASE_DB_URL: direct.SUPABASE_DB_URL.replace(
            'db.example.',
            'db.other.',
          ),
        },
        'example',
      ),
    /matching/,
  );
  assert.throws(() => connectionEnvironment(env, 'wrong'), /match/);
  assert.throws(
    () =>
      connectionEnvironment(
        {
          ...env,
          SUPABASE_DB_URL: env.SUPABASE_DB_URL.replace(
            'sslmode=require',
            'sslmode=disable',
          ),
        },
        'example',
      ),
    /session-pooler/,
  );
  assert.throws(
    () =>
      connectionEnvironment(
        { ...env, SUPABASE_SECRET_KEY: 'sb_publishable_example' },
        'example',
      ),
    /secret/,
  );
});
test('schema runner is atomic and tracks immutable migration checksums', () => {
  const sql = schemaSql();
  assert.equal(sql.match(/^begin;/gm).length, 1);
  assert.equal(sql.match(/^commit;/gm).length, 1);
  assert.ok(sql.includes('Applied migration checksum changed'));
  assert.ok(sql.includes('pg_advisory_xact_lock'));
});
test('connection diagnostics are actionable without printing upstream details', () => {
  assert.match(
    describeDatabaseFailure({ stderr: 'Network is unreachable' }),
    /Session pooler/,
  );
  assert.match(
    describeDatabaseFailure({ stderr: 'password authentication failed' }),
    /Database authentication failed/,
  );
  assert.ok(
    !describeDatabaseFailure({ stderr: 'sensitive upstream detail' }).includes(
      'sensitive',
    ),
  );
});
test('hosted rehearsal pins the source and checks live state inside the locked transaction', () => {
  const { snapshot, manifest } = fixture();
  assert.throws(
    () => rehearsalSql(snapshot, manifest, 'wrong-project'),
    /Import source/,
  );
  const result = rehearsalSql(snapshot, manifest, 'demo-test');
  assert.ok(
    result.sql.indexOf('pg_advisory_xact_lock') <
      result.sql.indexOf('Rehearsal import refused'),
  );
  assert.ok(
    result.sql.indexOf('Rehearsal import refused') <
      result.sql.indexOf('insert into app.clubs'),
  );
  assert.ok(result.sql.includes('verified_at is not null'));
  assert.ok(result.sql.includes('app_private.outbox'));
});
