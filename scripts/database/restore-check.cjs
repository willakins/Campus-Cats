#!/usr/bin/env node
'use strict';
// Restores a backup only into a new, isolated local cluster. No hosted writes.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { argumentsFor } = require('./export-firestore.cjs');

function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (!args.backup) throw new Error('Missing --backup');
  const backup = path.resolve(args.backup);
  if (!fs.existsSync(backup)) throw new Error('Backup file not found');
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'campus-cats-restore-'),
  );
  fs.chmodSync(directory, 0o700);
  const port = '55439';
  const run = (command, values, input) =>
    execFileSync(command, values, {
      ...(input ? { input } : {}),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
  let started = false;
  try {
    run('initdb', [
      '-D',
      directory,
      '-A',
      'trust',
      '--no-locale',
      '--encoding=UTF8',
    ]);
    run('pg_ctl', [
      '-D',
      directory,
      '-l',
      path.join(directory, 'server.log'),
      '-o',
      `-k ${directory} -p ${port} -h ""`,
      'start',
    ]);
    started = true;
    const psql = [
      '-X',
      '-q',
      '-At',
      '-h',
      directory,
      '-p',
      port,
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
    ];
    run('psql', [...psql, '-f', path.join(__dirname, 'local-bootstrap.sql')]);
    run(
      'psql',
      psql,
      'create role postgres nologin; create role supabase_admin nologin;',
    );
    run('pg_restore', [
      '-h',
      directory,
      '-p',
      port,
      '-d',
      'postgres',
      '--no-owner',
      '--clean',
      '--if-exists',
      '--single-transaction',
      '--exit-on-error',
      backup,
    ]);
    const capacity = JSON.parse(
      run(
        'psql',
        psql,
        fs.readFileSync(path.join(__dirname, 'capacity.sql'), 'utf8'),
      )
        .toString()
        .trim(),
    );
    const privacyAndApi = JSON.parse(
      run(
        'psql',
        psql,
        `select jsonb_build_object(
      'client_rpc_denied', not has_function_privilege('authenticated', 'public.cc_catalog_page(text,text,integer,text,text)', 'execute'),
      'anonymous_rpc_denied', not has_function_privilege('anon', 'public.cc_catalog_page(text,text,integer,text,text)', 'execute'),
      'restored_catalog_page_count', jsonb_array_length(public.cc_catalog_page('campus-cats','campuscats-d7a5e',5)),
      'all_client_rpcs_denied', not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname like 'cc_%' and
          (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))),
      'restored_catalog_detail_found', public.cc_catalog_record('campus-cats','campuscats-d7a5e',
        public.cc_catalog_page('campus-cats','campuscats-d7a5e',1)->0->>'id') is not null,
      'migration_count', (select count(*) from app_private.schema_migrations));`,
      )
        .toString()
        .trim(),
    );
    assert.equal(privacyAndApi.client_rpc_denied, true);
    assert.equal(privacyAndApi.anonymous_rpc_denied, true);
    assert.equal(privacyAndApi.restored_catalog_page_count, 5);
    assert.equal(privacyAndApi.all_client_rpcs_denied, true);
    assert.equal(privacyAndApi.restored_catalog_detail_found, true);
    assert.equal(capacity.memberships_enabled, 0);
    if (args['expected-capacity']) {
      const report = JSON.parse(
        fs.readFileSync(args['expected-capacity'], 'utf8'),
      );
      const expected = report.capacity || report;
      for (const field of [
        'sightings',
        'catalog_entries',
        'effective_catalog_entries',
        'linked_catalog_entries',
        'schema_migration_count',
        'comments',
        'media_references',
        'memberships_enabled',
      ])
        assert.equal(
          capacity[field],
          expected[field],
          `Restored ${field} count mismatch`,
        );
    }
    console.log(
      JSON.stringify(
        { restoreVerified: true, localOnly: true, capacity, ...privacyAndApi },
        null,
        2,
      ),
    );
  } finally {
    if (started) run('pg_ctl', ['-D', directory, '-m', 'fast', 'stop']);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(
      error.status !== undefined
        ? 'Local backup restore check failed; no hosted database was changed.'
        : error.message,
    );
    process.exitCode = 1;
  }
}
