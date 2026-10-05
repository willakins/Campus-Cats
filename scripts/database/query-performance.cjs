#!/usr/bin/env node
'use strict';

// Read-only SQL timing and index diagnostics. Never print rows, raw plans or credentials.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { argumentsFor } = require('./export-firestore.cjs');
const { literal } = require('./prepare-import.cjs');
const {
  connectionEnvironment,
  describeDatabaseFailure,
} = require('./hosted.cjs');

function summarizePlan(explanation) {
  const result = explanation[0];
  const nodes = [];
  function visit(node) {
    nodes.push({
      type: node['Node Type'],
      relation: node['Relation Name'],
      index: node['Index Name'],
      estimatedRows: node['Plan Rows'],
      actualRows: node['Actual Rows'],
      loops: node['Actual Loops'],
    });
    for (const child of node.Plans || []) visit(child);
  }
  visit(result.Plan);
  return {
    planningMs: result['Planning Time'],
    executionMs: result['Execution Time'],
    sharedBlocksHit: result.Plan['Shared Hit Blocks'],
    sharedBlocksRead: result.Plan['Shared Read Blocks'],
    tempBlocksRead: result.Plan['Temp Read Blocks'],
    tempBlocksWritten: result.Plan['Temp Written Blocks'],
    nodes,
  };
}

function main() {
  const args = argumentsFor(process.argv.slice(2));
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../../supabase/source-manifest.production.json'),
      'utf8',
    ),
  );
  const projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  const environment = connectionEnvironment(process.env, projectRef);
  if (environment.SUPABASE_FIREBASE_PROJECT_ID !== manifest.project)
    throw new Error('Source project mismatch');
  const club = literal(manifest.club);
  const project = literal(manifest.project);
  function query(sql) {
    return JSON.parse(
      execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'], {
        env: environment,
        input: `begin read only; set local statement_timeout = '15s'; set local role service_role;\n${sql}\nrollback;`,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 25000,
      })
        .toString()
        .trim(),
    );
  }
  const matches = query(
    `select to_json(exists(select 1 from app.clubs where id = ${club} and firebase_project_id = ${project}));`,
  );
  if (!matches) throw new Error('Club/project mismatch');
  const cases = {
    recentSightings: `select id, observed_at from app.sightings where club_id = ${club} and visible order by observed_at desc, id desc limit 100`,
    catalogHistory: `select id, observed_at from app.sightings where club_id = ${club} and visible and catalog_id = (select catalog_id from app.sightings where club_id = ${club} and catalog_id is not null limit 1) order by observed_at desc, id desc limit 40`,
    guideHistory: `select id, observed_at from app.sightings where club_id = ${club} and visible and guide_taxon_id = (select guide_taxon_id from app.sightings where club_id = ${club} and visible and guide_taxon_id is not null limit 1) order by observed_at desc, id desc limit 40`,
    localCatalogNames: `select id, lower(name) from app.catalog where club_id = ${club} and visible order by lower(name), id limit 40`,
    catalogMedia: `select id, position from app.media_references where club_id = ${club} and owner_kind = 'catalog' and owner_id = (select owner_id from app.media_references where club_id = ${club} and owner_kind = 'catalog' limit 1) order by position, id limit 99`,
  };
  for (const sort of [
    'name-asc',
    'name-desc',
    'sightings',
    'recent',
    'hearts',
  ]) {
    cases[`discovery:${sort}`] =
      `select public.cc_catalog_discovery(${club}, ${project}, 'performance-probe', '', ${literal(sort)}, '{}'::text[], 40, null)`;
  }
  const samples = {};
  for (const [name, sql] of Object.entries(cases)) {
    samples[name] = [];
    for (let sample = 0; sample < 3; sample++) {
      samples[name].push(
        summarizePlan(query(`explain (analyze, buffers, format json) ${sql};`)),
      );
    }
  }
  const report = {
    checkedAt: new Date().toISOString(),
    databaseScope: 'selected relational copy; no production app traffic',
    sampleCountPerQuery: 3,
    caveats: [
      'Execution time is database-side, excluding Firebase gateway and client/network latency.',
      'Discovery is PL/pgSQL; its outer Result plan reports time/buffers but hides internal node plans.',
      'Base-table probes cover index predicates; they are not a reproduction of full discovery or effective-catalog queries.',
      'Three sequential samples are diagnostics, not a production p95 or concurrent load test.',
    ],
    samples,
  };
  if (args.output)
    fs.writeFileSync(args.output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(
      error.status !== undefined
        ? describeDatabaseFailure(error)
        : 'Query diagnostic failed. Check local configuration; no credentials were logged.',
    );
    process.exitCode = 1;
  }
}
module.exports = { summarizePlan };
