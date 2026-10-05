#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { argumentsFor } = require('./export-firestore.cjs');
const { literal, prepare } = require('./prepare-import.cjs');

function connectionEnvironment(env, projectRef) {
  if (!/^[a-z0-9]+$/.test(projectRef))
    throw new Error('Invalid Supabase project reference');
  const api = new URL(env.SUPABASE_URL || 'https://unconfigured.invalid');
  if (
    api.origin !== `https://${projectRef}.supabase.co` ||
    api.pathname !== '/' ||
    api.search ||
    api.hash
  )
    throw new Error('SUPABASE_URL must match --project-ref');
  if (!env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_'))
    throw new Error('Missing server secret key');
  const db = new URL(
    env.SUPABASE_DB_URL || 'postgresql://unconfigured.invalid',
  );
  const sessionPooler =
    db.hostname.endsWith('.pooler.supabase.com') &&
    decodeURIComponent(db.username) === `postgres.${projectRef}`;
  const directConnection =
    db.hostname === `db.${projectRef}.supabase.co` &&
    decodeURIComponent(db.username) === 'postgres';
  if (
    db.protocol !== 'postgresql:' ||
    (!sessionPooler && !directConnection) ||
    db.port !== '5432' ||
    !db.password ||
    db.pathname !== '/postgres' ||
    db.searchParams.get('sslmode') !== 'require'
  ) {
    throw new Error(
      'Use the matching Supabase direct or session-pooler PostgreSQL URI with sslmode=require',
    );
  }
  if (!env.SUPABASE_FIREBASE_PROJECT_ID)
    throw new Error('Missing SUPABASE_FIREBASE_PROJECT_ID');
  return {
    ...env,
    PGHOST: db.hostname,
    PGPORT: db.port,
    PGUSER: decodeURIComponent(db.username),
    PGPASSWORD: decodeURIComponent(db.password),
    PGDATABASE: 'postgres',
    PGSSLMODE: 'require',
    PGCONNECT_TIMEOUT: '15',
    PGOPTIONS: '-c statement_timeout=60000 -c lock_timeout=10000',
  };
}

function schemaSql() {
  const directory = path.join(__dirname, '../../supabase/migrations');
  const statements = [
    'begin;',
    "select pg_advisory_xact_lock(hashtext('campus-cats-schema'));",
    'create schema if not exists app_private;',
    'revoke all on schema app_private from public, anon, authenticated;',
    'create table if not exists app_private.schema_migrations (version text primary key, sha256 text not null, applied_at timestamptz not null default now());',
    'alter table app_private.schema_migrations enable row level security;',
    'revoke all on app_private.schema_migrations from public, anon, authenticated;',
  ];
  for (const filename of fs
    .readdirSync(directory)
    .filter((file) => /^\d+_[a-z_]+\.sql$/.test(file))
    .sort()) {
    const source = fs.readFileSync(path.join(directory, filename), 'utf8');
    const hash = crypto.createHash('sha256').update(source).digest('hex');
    const version = literal(filename);
    statements.push(
      `do $$ begin if exists (select 1 from app_private.schema_migrations where version = ${version} and sha256 <> ${literal(hash)}) then raise exception 'Applied migration checksum changed'; end if; end $$;`,
      `select exists(select 1 from app_private.schema_migrations where version = ${version}) as migration_applied \\gset`,
      '\\if :migration_applied',
      '\\else',
      source.replace(/^begin;\s*$/m, '').replace(/^commit;\s*$/m, ''),
      `insert into app_private.schema_migrations(version, sha256) values (${version}, ${literal(hash)});`,
      '\\endif',
    );
  }
  statements.push('commit;');
  return statements.join('\n');
}

function describeDatabaseFailure(error) {
  const stderr = String(error.stderr || '');
  if (error.code === 'ETIMEDOUT')
    return 'The PostgreSQL operation timed out. Check target state before retrying.';
  if (/Network is unreachable/.test(stderr))
    return 'The direct database endpoint requires IPv6, which this network cannot reach. Use Connect > Method > Session pooler on port 5432.';
  if (/could not translate host name/.test(stderr))
    return 'The database hostname could not be resolved. Check the hostname copied from the Supabase Connect dialog.';
  if (/password authentication failed|Tenant or user not found/i.test(stderr))
    return 'Database authentication failed. Check the database password and the username for the selected connection method.';
  if (/timeout|timed out/i.test(stderr))
    return 'The database connection timed out. Check project availability and network access.';
  return 'PostgreSQL command failed; inspect the hosted database logs. No credentials were logged.';
}

function rehearsalSql(snapshot, manifest, firebaseProject) {
  if (manifest.project !== firebaseProject)
    throw new Error(
      'Import source does not match SUPABASE_FIREBASE_PROJECT_ID',
    );
  const prepared = prepare(snapshot, manifest);
  const club = literal(manifest.club);
  const guard = `do $$ begin
    if exists(select 1 from app_private.memberships where club_id = ${club} and (access_enabled or verified_at is not null))
      or exists(select 1 from app_private.outbox where club_id = ${club}) then
      raise exception 'Rehearsal import refused: dataset has live access or activity';
    end if;
    if exists(select 1 from app.clubs where id = ${club} and firebase_project_id <> ${literal(firebaseProject)}) then
      raise exception 'Rehearsal import refused: club belongs to a different Firebase project';
    end if;
  end $$;`;
  // Run the guard after the import's advisory lock, inside the same transaction.
  const sql = prepared.sql.replace(
    /(select pg_advisory_xact_lock\([^\n]+\);\n)/,
    (lockStatement) => `${lockStatement}${guard}\n`,
  );
  if (!sql.includes(guard))
    throw new Error('Import transaction guard could not be installed');
  return { ...prepared, sql };
}

function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (
    ![
      'check',
      'apply-schema',
      'rehearse-import',
      'capacity',
      'backup',
    ].includes(args.mode)
  )
    throw new Error(
      'Use --mode check, apply-schema, rehearse-import, capacity or backup',
    );
  const environment = connectionEnvironment(
    process.env,
    args['project-ref'] || '',
  );
  if (args.mode === 'backup') {
    if (!args.output) throw new Error('Missing --output for private backup');
    const output = path.resolve(args.output),
      repo = path.resolve(__dirname, '../..');
    if (output === repo || output.startsWith(repo + path.sep))
      throw new Error('Save backups outside the repository');
    // Exclusive creation prevents overwriting an existing backup.
    const descriptor = fs.openSync(output, 'wx', 0o600);
    try {
      execFileSync(
        'pg_dump',
        [
          '--format=custom',
          '--no-owner',
          '--schema=app',
          '--schema=app_private',
          '--schema=public',
        ],
        {
          env: environment,
          stdio: ['ignore', descriptor, 'pipe'],
          timeout: 120000,
        },
      );
    } catch (error) {
      fs.unlinkSync(output);
      throw error;
    } finally {
      fs.closeSync(descriptor);
    }
    console.log(
      JSON.stringify({
        backupComplete: true,
        output,
        bytes: fs.statSync(output).size,
      }),
    );
    return;
  }
  let sql, report;
  if (args.mode === 'check') {
    sql =
      "select jsonb_build_object('connected', true, 'postgres_version', current_setting('server_version'), 'database_bytes', pg_database_size(current_database()));";
  } else if (args.mode === 'apply-schema') {
    sql = schemaSql();
  } else if (args.mode === 'capacity') {
    sql = fs.readFileSync(path.join(__dirname, 'capacity.sql'), 'utf8');
  } else {
    if (!args.export || !args.manifest)
      throw new Error('Rehearsal requires --export and --manifest');
    const prepared = rehearsalSql(
      JSON.parse(fs.readFileSync(args.export, 'utf8')),
      JSON.parse(fs.readFileSync(args.manifest, 'utf8')),
      environment.SUPABASE_FIREBASE_PROJECT_ID,
    );
    sql = prepared.sql;
    report = prepared.report;
  }
  const result = execFileSync(
    'psql',
    ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'],
    {
      env: environment,
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    },
  );
  console.log(result.toString().trim());
  if (report)
    console.log(
      JSON.stringify({ rehearsalImportComplete: true, ...report }, null, 2),
    );
  console.log(
    args.mode === 'check'
      ? 'Connection check passed; no data was changed.'
      : args.mode === 'apply-schema'
        ? 'Versioned schema applied; application traffic is unchanged.'
        : args.mode === 'capacity'
          ? 'Capacity report complete.'
          : 'Rehearsal import complete; Firebase remains authoritative.',
  );
}
if (require.main === module) {
  try {
    main();
  } catch (error) {
    // Deliberately suppress database driver stderr, connection strings and environment values.
    console.error(
      error.status !== undefined
        ? describeDatabaseFailure(error)
        : error.message,
    );
    process.exitCode = 1;
  }
}
module.exports = {
  connectionEnvironment,
  schemaSql,
  describeDatabaseFailure,
  rehearsalSql,
};
