#!/usr/bin/env node
'use strict';

// Read-only export. Never logs document contents or credentials.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const COLLECTIONS = [
  'users',
  'public-profiles',
  'catalog',
  'cat-sightings',
  'catalog-favorites',
  'catalog-tag-settings',
  'catalog-tag-assignments',
  'content-contributors',
  'stations',
  'alerts',
  'alert-read-receipts',
  'community-events',
  'event-read-receipts',
  'community-surveys',
  'survey-responses',
  'survey-submission-receipts',
  'community-votes',
  'community-vote-state',
  'community-vote-nominees',
  'community-vote-nomination-receipts',
  'community-vote-ballots',
  'community-vote-ballot-receipts',
  'inaturalist-observations',
  'inaturalist-guide-profiles',
  'inaturalist-public-links',
  'sighting-comments',
  'catalog-comments',
  'station-comments',
  'inaturalist-comment-moderation',
];

function argumentsFor(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || !argv[i + 1])
      throw new Error('Expected --name value pairs');
    args[argv[i].slice(2)] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  for (const key of ['project', 'club', 'output'])
    if (!args[key]) throw new Error(`Missing --${key}`);
  for (const key of ['project', 'club'])
    if (!/^[a-zA-Z0-9_-]+$/.test(args[key])) throw new Error(`Invalid ${key}`);
  const output = path.resolve(args.output);
  const repo = path.resolve(__dirname, '../..');
  if (output === repo || output.startsWith(repo + path.sep))
    throw new Error('Save private exports outside the repository');
  if (fs.existsSync(output))
    throw new Error('Output already exists; use a new filename');
  const credentials = JSON.parse(
    fs.readFileSync(
      path.join(os.homedir(), '.config/configstore/firebase-tools.json'),
      'utf8',
    ),
  );
  let token = credentials.tokens?.access_token;
  if (!token || credentials.tokens.expires_at < Date.now() + 60000) {
    const api = require('firebase-tools/lib/api');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.tokens.refresh_token,
        client_id: api.clientId(),
        client_secret: api.clientSecret(),
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    if (!response.ok || !data.access_token)
      throw new Error(`OAuth refresh failed (${response.status})`);
    token = data.access_token;
  }
  const base = `https://firestore.googleapis.com/v1/projects/${args.project}/databases/(default)/documents`;
  async function request(url, body) {
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(
        `Firestore export failed (${response.status}); no import generated`,
      );
    return response.json();
  }
  const startedAt = new Date().toISOString();
  const documents = [];
  async function collection(relative) {
    let pageToken;
    do {
      const url = new URL(`${base}/${relative}`);
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const page = await request(url);
      for (const doc of page.documents || []) {
        const docPath = doc.name.slice(
          base.replace('https://firestore.googleapis.com/v1/', '').length + 1,
        );
        documents.push({
          path: docPath,
          fields: doc.fields || {},
          createTime: doc.createTime,
          updateTime: doc.updateTime,
        });
        let childToken;
        do {
          const children = await request(
            `${base}/${docPath}:listCollectionIds`,
            {
              pageSize: 1000,
              ...(childToken ? { pageToken: childToken } : {}),
            },
          );
          for (const id of children.collectionIds || [])
            await collection(`${docPath}/${id}`);
          childToken = children.nextPageToken;
        } while (childToken);
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
  }
  const club = await request(`${base}/clubs/${args.club}`);
  documents.push({
    path: `clubs/${args.club}`,
    fields: club.fields || {},
    createTime: club.createTime,
    updateTime: club.updateTime,
  });
  for (const id of COLLECTIONS) {
    await collection(id);
    if (id !== 'users') await collection(`clubs/${args.club}/${id}`);
  }
  const result = {
    version: 1,
    project: args.project,
    club: args.club,
    startedAt,
    completedAt: new Date().toISOString(),
    consistentSnapshot: false,
    documents,
  };
  fs.writeFileSync(output, JSON.stringify(result), { mode: 0o600, flag: 'wx' });
  const counts = {};
  for (const doc of documents) {
    const source = doc.path.split('/').slice(0, -1).join('/');
    counts[source] = (counts[source] || 0) + 1;
  }
  console.log(
    JSON.stringify(
      {
        project: args.project,
        club: args.club,
        documents: documents.length,
        counts,
        output,
      },
      null,
      2,
    ),
  );
}

if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { argumentsFor, COLLECTIONS };
