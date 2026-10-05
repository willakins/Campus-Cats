const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decode, literal, prepare } = require('./prepare-import.cjs');

const fields = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item === null
        ? { nullValue: null }
        : typeof item === 'string'
          ? { stringValue: item }
          : typeof item === 'number'
            ? { integerValue: String(item) }
            : typeof item === 'boolean'
              ? { booleanValue: item }
              : Array.isArray(item)
                ? {
                    arrayValue: {
                      values: item.map((element) => ({ stringValue: element })),
                    },
                  }
                : { mapValue: { fields: fields(item) } },
    ]),
  );
const document = (path, data) => ({
  path,
  fields: fields(data),
  updateTime: '2026-10-01T00:00:00Z',
});
const manifest = {
  version: 1,
  project: 'demo-test',
  club: 'cats',
  sources: {
    catalog: 'root',
    'cat-sightings': 'root',
    'inaturalist-guide-profiles': 'tenant',
  },
};
const cat = (name) => ({
  cat: { name },
  credits: '',
  createdAt: '2026-01-01T00:00:00Z',
});
const sighting = (name) => ({
  name,
  info: '',
  date: '2026-01-01T00:00:00Z',
  fed: true,
  health: true,
  location: { latitude: 33, longitude: -84 },
  createdBy: {
    id: 'legacy-author',
    email: 'must-not-copy@example.test',
    role: 1,
  },
});
const snapshot = (documents) => ({
  version: 1,
  project: 'demo-test',
  club: 'cats',
  consistentSnapshot: false,
  documents: [document('clubs/cats', { name: 'Cats' }), ...documents],
});

test('rejects mismatched projects, unknown sources and cross-club content', () => {
  assert.throws(
    () => prepare(snapshot([]), { ...manifest, project: 'production' }),
    /must match/,
  );
  assert.throws(
    () => prepare(snapshot([document('unmapped/one', {})]), manifest),
    /source mapping/,
  );
  assert.throws(
    () =>
      prepare(
        snapshot([document('catalog/one', { ...cat('One'), clubId: 'other' })]),
        manifest,
      ),
    /Cross-club/,
  );
});
test('keeps contributor identities private and safely quotes literal SQL values', () => {
  const result = prepare(
    snapshot([
      document('catalog/one', cat("Cat'); drop table app.catalog; --")),
      document('cat-sightings/one', sighting('Unmatched')),
    ]),
    manifest,
  );
  assert.equal(result.report.unresolvedSightingLinks, 1);
  assert.ok(!result.sql.includes('must-not-copy@example.test'));
  assert.ok(result.sql.includes('app_private.contributors'));
  assert.equal(literal("a'\\b"), "'a''\\b'");
  assert.throws(() => literal('a\0b'), /NUL/);
  assert.throws(() => decode({ integerValue: '9007199254740993' }), /Unsafe/);
});
test('links only unique exact names and preserves source-specific IDs', () => {
  const result = prepare(
    snapshot([
      document('catalog/one', cat('Same')),
      document('catalog/two', cat('Same')),
      document('cat-sightings/s1', sighting('Same')),
      document('clubs/cats/inaturalist-guide-profiles/123', {
        displayName: 'Guide',
        shortDescription: 'Guide entry',
        sourceUpdatedAt: '2026-01-01T00:00:00Z',
        matchStatus: 'unlinked',
        visible: true,
        sourceActive: true,
      }),
      document('inaturalist-guide-profiles/123', { displayName: 'Stale' }),
    ]),
    manifest,
  );
  assert.equal(result.report.unresolvedSightingLinks, 1);
  assert.equal(result.report.excluded['root/inaturalist-guide-profiles'], 1);
  assert.ok(result.sql.includes("'inat-guide-123'"));
  assert.ok(!result.sql.includes("'Stale'"));
  assert.equal(
    prepare(snapshot([]), manifest).sql,
    prepare(snapshot([]), manifest).sql,
  );
});
test('unsupported populated feature blocks preparation instead of silently dropping it', () => {
  assert.throws(
    () =>
      prepare(snapshot([document('future-feature/v1', {})]), {
        ...manifest,
        sources: { ...manifest.sources, 'future-feature': 'root' },
      }),
    /Transformer not implemented/,
  );
});
test('server-side batch delimiters cannot be terminated by document contents', () => {
  const result = prepare(
    snapshot([document('catalog/one', cat('A $cc_import_batch_0_0$ name'))]),
    manifest,
  );
  assert.ok(result.sql.includes('do $cc_import_batch_0_1$ begin'));
  assert.ok(result.sql.includes("'A $cc_import_batch_0_0$ name'"));
  assert.throws(
    () => prepare(snapshot([]), { ...manifest, club: 'bad$$club' }),
    /Invalid source/,
  );
});
test('retains explicitly mapped historical catalog links without replacing newer imported facts', () => {
  const docs = [
    document('catalog/local', cat('Local name')),
    document('inaturalist-guide-profiles/123', {
      linkedLocalCatalogId: 'local',
      matchStatus: 'linked',
      displayName: 'Old source',
    }),
    document('clubs/cats/inaturalist-guide-profiles/123', {
      displayName: 'Current source',
      shortDescription: 'Current description',
      sourceUpdatedAt: '2026-01-01T00:00:00Z',
      matchStatus: 'unlinked',
      visible: true,
      sourceActive: true,
    }),
  ];
  const mapping = {
    ...manifest,
    relationshipSources: { 'inaturalist-guide-profiles': 'root' },
  };
  const result = prepare(snapshot(docs), mapping);
  assert.equal(result.report.restoredCatalogLinks, 1);
  assert.ok(result.sql.includes("'Current source'"));
  assert.ok(!result.sql.includes("'Old source'"));
  assert.ok(result.sql.includes("'inaturalist-guide-profiles/123'"));
  const conflicting = docs.map((doc) =>
    doc.path.startsWith('clubs/cats/inaturalist')
      ? document(doc.path, {
          displayName: 'Current source',
          linkedLocalCatalogId: 'different',
          matchStatus: 'linked',
        })
      : doc,
  );
  assert.throws(
    () => prepare(snapshot(conflicting), mapping),
    /Conflicting imported/,
  );
});
