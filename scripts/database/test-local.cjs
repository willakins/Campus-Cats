#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { schemaSql, rehearsalSql } = require('./hosted.cjs');
const { fixture } = require('./migration-fixture.cjs');

const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'campus-cats-sql-test-'),
);
fs.chmodSync(directory, 0o700);
const port = '55439'; // Every run has a separate Unix socket directory; no TCP listener.
const run = (command, args) =>
  execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
  // Apply the real hosted runner twice: migration versioning must make the second run harmless.
  for (let i = 0; i < 2; i++)
    execFileSync('psql', psql, {
      input: schemaSql(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  const synthetic = fixture();
  const importSql = rehearsalSql(
    synthetic.snapshot,
    synthetic.manifest,
    'demo-test',
  ).sql;
  for (let i = 0; i < 2; i++)
    execFileSync('psql', psql, {
      input: importSql,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  const counts = run('psql', [
    ...psql,
    '-At',
    '-c',
    "select (select count(*) from app.vote_ballots)::text || ',' || (select count(*) from app.survey_answer_options)::text || ',' || (select count(*) from app_private.outbox)::text",
  ]);
  if (counts.toString().trim() !== '2,2,0')
    throw new Error(
      'Import duplicated ballots/options or generated user activity',
    );
  run('psql', [...psql, '-f', path.join(__dirname, 'sql-test.sql')]);
  run('psql', [
    ...psql,
    '-f',
    path.join(__dirname, 'catalog-discovery-test.sql'),
  ]);
  run('psql', [
    ...psql,
    '-f',
    path.join(__dirname, 'catalog-favorites-test.sql'),
  ]);
  run('psql', [
    ...psql,
    '-f',
    path.join(__dirname, 'catalog-details-test.sql'),
  ]);
  execFileSync('psql', psql, {
    input: `
    insert into app.clubs values('concurrent-favorites','Concurrent','demo-test');
    insert into app.catalog(club_id,id,source,name) values('concurrent-favorites','cat','campus-cats','Cat');
    insert into app_private.domain_backends values('concurrent-favorites','catalog_core','postgres');`,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  // Separate connections exercise duplicate requests racing the initial commit.
  execFileSync(
    process.execPath,
    [
      '-e',
      `
    const {execFile}=require('node:child_process');
    const args=JSON.parse(process.argv[1]);
    const sql="select public.cc_set_catalog_favorite('concurrent-favorites','demo-test','concurrent-user',0,'same-request','cat');";
    const call=()=>new Promise((resolve,reject)=>execFile('psql',[...args,'-At','-c',sql],(error,out)=>error?reject(error):resolve(out.trim())));
    Promise.all([call(),call()]).then(results=>{if(results[0]!==results[1])throw new Error('Concurrent receipts differ');})
      .catch(()=>{console.error('Concurrent favorite test failed');process.exitCode=1;});`,
      JSON.stringify(psql),
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const concurrentCounts = run('psql', [
    ...psql,
    '-At',
    '-c',
    "select (select count(*) from app_private.mutation_receipts where club_id='concurrent-favorites')::text||','||(select count(*) from app_private.outbox where club_id='concurrent-favorites')::text",
  ]);
  if (concurrentCounts.toString().trim() !== '1,1')
    throw new Error('Concurrent requests duplicated receipts or side effects');
  console.log(
    'PostgreSQL schema, tenant constraints, privacy grants, pagination and bounded queries passed.',
  );
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (started) run('pg_ctl', ['-D', directory, '-m', 'fast', 'stop']);
  fs.rmSync(directory, { recursive: true, force: true });
}
