import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CatalogImport,
  ImportClock,
  ImportRepository,
  InaturalistHttpGateway,
  InaturalistGateway,
  ObservationCommentImport,
  ObservationImport,
  SyncRunSummary,
  mapGuideTaxon,
  mapObservation,
  normalizeCatName,
  runInaturalistSync,
} from './inaturalist';

const now = new Date('2026-08-04T07:17:00.000Z');

const guideTaxon = {
  id: 2113386,
  guide_id: 18800,
  display_name: 'Mimi',
  name: 'Black-and-white male with chin-spot',
  updated_at: '2025-05-20T01:14:20.435Z',
  tag_list: [
    'Years Recorded = 2025',
    'Area of Residence = Central Campus',
    'Current Status = Feral',
    'Fur Length = Short',
    'Fur Pattern = Black and White',
    'sex = Male',
    'TNR = Yes',
  ],
  guide_photos: [
    {
      id: 2630516,
      position: 1,
      photo_id: 483289895,
      large_url:
        'https://inaturalist-open-data.s3.amazonaws.com/photos/483289895/large.jpeg',
      small_url:
        'https://inaturalist-open-data.s3.amazonaws.com/photos/483289895/small.jpeg',
      photo: {
        id: 483289895,
        license_code: 'CC-BY-NC',
        license_url: 'https://creativecommons.org/licenses/by-nc/4.0/',
        attribution: '(c) chatcher34, some rights reserved (CC BY-NC)',
      },
    },
    {
      id: 2316262,
      position: 2,
      photo_id: 347966365,
      large_url: 'https://static.inaturalist.org/photos/347966365/large.jpeg',
      small_url: 'https://static.inaturalist.org/photos/347966365/small.jpeg',
      photo: {
        id: 347966365,
        license_code: 'C',
        license_url: 'https://en.wikipedia.org/wiki/Copyright',
        attribution: '(c) photographer, all rights reserved',
      },
    },
  ],
};

const observation = {
  id: 321,
  uuid: 'a1d112b8-954b-4a65-a574-d73092f1cd38',
  updated_at: '2026-07-07T19:07:14-04:00',
  time_observed_at: '2026-07-07T18:30:00-04:00',
  observed_on: '2026-07-07',
  description: 'Seen near Tech Parkway',
  quality_grade: 'casual',
  license_code: 'cc-by-nc',
  positional_accuracy: 10,
  geojson: { type: 'Point', coordinates: [-84.396, 33.776] },
  ofvs: [
    {
      field_id: 16302,
      value: 'Mimi (black-and-white with black spot on chin)',
    },
  ],
  photos: [
    {
      id: 1,
      url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg',
      license_code: 'cc-by-nc',
      attribution: '(c) Observer, some rights reserved (CC BY-NC)',
    },
    {
      id: 2,
      url: 'https://static.inaturalist.org/photos/2/square.jpg',
      license_code: null,
      attribution: '(c) Observer, all rights reserved',
    },
  ],
  comments: [
    {
      id: 22894482,
      uuid: 'e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
      body: 'Pretty sure this is Charles!',
      created_at: '2026-08-10T22:53:45-04:00',
      updated_at: '2026-08-10T22:53:45-04:00',
      hidden: false,
      user: {
        id: 8358607,
        login: 'chipmunkt',
        name: 'Chip Munk',
      },
    },
    {
      id: 22894483,
      uuid: 'e221e4fd-b34c-43ec-b21a-e36c1ba327d8',
      body: 'Hidden upstream',
      created_at: '2026-08-10T23:00:00-04:00',
      hidden: true,
      user: { id: 8358608, login: 'moderated', name: null },
    },
  ],
  user: { id: 42, login: 'observer', name: 'Observer' },
};

describe('iNaturalist mappers', () => {
  it('maps every quality grade while filtering unlicensed media', () => {
    const results = (['casual', 'needs_id', 'research'] as const).map(
      (qualityGrade) =>
        mapObservation(
          { ...observation, quality_grade: qualityGrade },
          new Map([['mimi', 2113386]]),
          now,
          'run-1',
        ),
    );
    const result = results[0];

    assert.deepEqual(results.map(({ qualityGrade }) => qualityGrade), [
      'casual',
      'needs_id',
      'research',
    ]);
    assert.deepEqual(result.location, {
      latitude: 33.776,
      longitude: -84.396,
    });
    assert.equal(result.guideTaxonId, 2113386);
    assert.equal(result.photos.length, 1);
    assert.equal(result.photos[0].role, 'profile');
    assert.match(result.photos[0].url, /\/large\.jpg$/);
    assert.match(result.photos[0].thumbnailUrl, /\/small\.jpg$/);
    assert.deepEqual(result.comments, [
      {
        schemaVersion: 1,
        id: 22894482,
        uuid: 'e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
        observationId: 321,
        sourceUrl:
          'https://www.inaturalist.org/observations/321#comment-22894482',
        body: 'Pretty sure this is Charles!',
        createdAt: new Date('2026-08-11T02:53:45.000Z'),
        sourceUpdatedAt: new Date('2026-08-11T02:53:45.000Z'),
        author: {
          id: 8358607,
          login: 'chipmunkt',
          displayName: 'Chip Munk',
          sourceUrl: 'https://www.inaturalist.org/people/chipmunkt',
        },
        lastSeenRunId: 'run-1',
      },
    ]);
  });

  it('omits blank observer display names', () => {
    const result = mapObservation(
      {
        ...observation,
        user: { ...observation.user, name: '   ' },
      },
      new Map(),
      now,
      'run-1',
    );

    assert.deepEqual(result.observer, { id: 42, login: 'observer' });
  });

  it('retains every supported Creative Commons photo license', () => {
    const licenses = [
      'cc0',
      'cc-by',
      'cc-by-nc',
      'cc-by-sa',
      'cc-by-nd',
      'cc-by-nc-sa',
      'cc-by-nc-nd',
    ];
    const result = mapObservation(
      {
        ...observation,
        photos: licenses.map((licenseCode, index) => ({
          ...observation.photos[0],
          id: index + 1,
          license_code: licenseCode,
        })),
      },
      new Map(),
      now,
      'run-1',
    );

    assert.deepEqual(
      result.photos.map(({ licenseCode }) => licenseCode),
      licenses.map((license) => license.toUpperCase()),
    );
  });

  it('does not copy unlicensed descriptions and preserves date-only precision', () => {
    const result = mapObservation(
      {
        ...observation,
        id: 322,
        uuid: 'cdd07dc6-0cc1-43ef-95b6-e600fb763fc0',
        time_observed_at: null,
        license_code: null,
        geojson: null,
        photos: [],
      },
      new Map(),
      now,
      'run-1',
    );

    assert.equal(result.description, '');
    assert.equal(result.observedTimePrecision, 'date');
    assert.equal(result.observedOn, '2026-07-07');
    assert.equal(result.location, null);
  });

  it('never links generic observation field values to catalog profiles', () => {
    for (const [index, fieldValue] of ['Ginger', 'Multiple individuals'].entries()) {
      const result = mapObservation(
        {
          ...observation,
          id: 500 + index,
          uuid: `a1d112b8-954b-4a65-a574-d73092f1cd3${index}`,
          ofvs: [{ field_id: 16302, value: fieldValue }],
        },
        new Map([
          ['ginger', 2100],
          ['multiple individuals', 2101],
        ]),
        now,
        'run-1',
      );

      assert.equal(result.guideTaxonId, undefined);
      assert.equal(result.observationFieldValue, fieldValue);
    }
  });

  it('maps structured guide tags and excludes copyright-only photos', () => {
    const result = mapGuideTaxon(guideTaxon, now, 'run-1');

    assert.equal(result.displayName, 'Mimi');
    assert.deepEqual(result.metadata.yearsRecorded, ['2025']);
    assert.deepEqual(result.metadata.areasOfResidence, ['Central Campus']);
    assert.equal(result.metadata.currentStatus, 'Feral');
    assert.equal(result.metadata.sex, 'Male');
    assert.equal(result.photos.length, 1);
    assert.equal(result.photos[0].licenseCode, 'CC-BY-NC');
  });

  it('skips malformed licensed media without dropping its source record', () => {
    const catalog = mapGuideTaxon(
      {
        ...guideTaxon,
        guide_photos: [
          guideTaxon.guide_photos[0],
          {
            ...guideTaxon.guide_photos[0],
            id: 99,
            large_url: '/relative/large.png',
          },
        ],
      },
      now,
      'run-1',
    );
    const sighting = mapObservation(
      {
        ...observation,
        photos: [
          observation.photos[0],
          { ...observation.photos[0], id: 99, url: '/relative/square.jpg' },
        ],
      },
      new Map(),
      now,
      'run-1',
    );

    assert.equal(catalog.photos.length, 1);
    assert.equal(sighting.photos.length, 1);
  });

  it('retains unnamed guide profiles without inventing a source identity', () => {
    const result = mapGuideTaxon(
      { ...guideTaxon, id: 2269479, display_name: '' },
      now,
      'run-1',
    );

    assert.equal(result.displayName, 'Unnamed cat #2269479');
    assert.equal(
      result.shortDescription,
      'Black-and-white male with chin-spot',
    );
    assert.equal(result.matchStatus, 'unlinked');
  });
});

describe('iNaturalist HTTP gateway', () => {
  it('uses v2 cursor pagination, a custom user agent, and Retry-After', async () => {
    const requests: Array<{ url: string; headers?: Record<string, string> }> = [];
    const delays: number[] = [];
    let attempt = 0;
    const http = new InaturalistHttpGateway({
      async fetch(url, init) {
        requests.push({ url, headers: init.headers });
        attempt += 1;
        if (attempt === 1) {
          return {
            ok: false,
            status: 429,
            headers: { get: (name) => (name === 'Retry-After' ? '2' : null) },
            async json() {
              return {};
            },
          };
        }
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          async json() {
            return { total_results: 1, results: [observation] };
          },
        };
      },
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    });

    const page = await http.listObservations(300);

    assert.equal(page.results.length, 1);
    assert.equal(page.hasMore, false);
    assert.match(requests[0].url, /api\.inaturalist\.org\/v2\/observations/);
    assert.match(requests[0].url, /id_above=300/);
    assert.match(requests[0].url, /fields=/);
    assert.match(decodeURIComponent(requests[0].url), /comments:/);
    assert.match(
      requests[0].headers?.['User-Agent'] ?? '',
      /Campus-Cats/,
    );
    assert.ok(delays.includes(2000));
  });

  it('does not retry client errors that cannot succeed unchanged', async () => {
    let attempts = 0;
    const http = new InaturalistHttpGateway({
      async fetch() {
        attempts += 1;
        return {
          ok: false,
          status: 400,
          headers: { get: () => null },
          async json() {
            return {};
          },
        };
      },
      sleep: async () => undefined,
    });

    await assert.rejects(() => http.listObservations(), /HTTP 400/);
    assert.equal(attempts, 1);
  });
});

class MemoryRepository implements ImportRepository {
  readonly observations = new Map<number, ObservationImport>();
  readonly importedComments = new Map<string, ObservationCommentImport>();
  readonly hiddenImportedCommentIds = new Set<string>();
  readonly catalog = new Map<number, CatalogImport>();
  readonly localCatalog = new Map<string, string>();
  summaries: SyncRunSummary[] = [];
  leaseAvailable = true;
  leaseUntil?: Date;
  failObservationBatch = false;
  failCatalogBatch = false;

  async acquireLease(_runId: string, current: Date, leaseUntil: Date): Promise<boolean> {
    if (!this.leaseAvailable && this.leaseUntil && this.leaseUntil > current) {
      return false;
    }
    this.leaseAvailable = false;
    this.leaseUntil = leaseUntil;
    return true;
  }

  async releaseLease(): Promise<void> {
    this.leaseAvailable = true;
    this.leaseUntil = undefined;
  }

  async listGuideNames() {
    return [...this.catalog.values()].map(({ id, displayName }) => ({
      id,
      displayName,
    }));
  }

  async listLocalCatalogEntries() {
    return [...this.localCatalog].map(([id, name]) => ({ id, name }));
  }

  async upsertObservations(values: readonly ObservationImport[]) {
    if (this.failObservationBatch) throw new Error('observation batch failed');
    let created = 0;
    let updated = 0;
    for (const value of values) {
      const previous = this.observations.get(value.id);
      if (previous) updated += 1;
      else created += 1;
      this.observations.set(value.id, {
        ...value,
        importedAt: previous?.importedAt ?? value.importedAt,
        moderation: previous?.moderation ?? value.moderation,
        visible: value.sourceActive && !(previous?.moderation.hidden ?? false),
        guideTaxonId:
          value.guideTaxonId ??
          (previous?.guideTaxonId &&
          previous.observationFieldValue &&
          value.observationFieldValue &&
          normalizeCatName(previous.observationFieldValue) ===
            normalizeCatName(value.observationFieldValue)
            ? previous.guideTaxonId
            : undefined),
      });
      for (const comment of value.comments) {
        if (!this.hiddenImportedCommentIds.has(comment.uuid)) {
          this.importedComments.set(comment.uuid, comment);
        }
      }
    }
    return { created, updated };
  }

  async upsertCatalog(values: readonly CatalogImport[]) {
    if (this.failCatalogBatch) throw new Error('catalog batch failed');
    let created = 0;
    let updated = 0;
    for (const value of values) {
      const previous = this.catalog.get(value.id);
      if (previous) updated += 1;
      else created += 1;
      this.catalog.set(value.id, {
        ...value,
        importedAt: previous?.importedAt ?? value.importedAt,
        moderation: previous?.moderation ?? value.moderation,
        overrides: previous?.overrides ?? value.overrides,
        linkedLocalCatalogId:
          previous?.linkedLocalCatalogId ?? value.linkedLocalCatalogId,
        matchStatus: previous?.linkedLocalCatalogId
          ? 'linked'
          : value.matchStatus,
        visible: value.sourceActive && !(previous?.moderation.hidden ?? false),
      });
    }
    return { created, updated };
  }

  async deactivateMissingObservations(seen: ReadonlySet<number>) {
    let count = 0;
    for (const [id, value] of this.observations) {
      if (!seen.has(id) && value.sourceActive) {
        this.observations.set(id, {
          ...value,
          sourceActive: false,
          visible: false,
        });
        count += 1;
      }
    }
    return count;
  }

  async deactivateMissingCatalog(seen: ReadonlySet<number>) {
    let count = 0;
    for (const [id, value] of this.catalog) {
      if (!seen.has(id) && value.sourceActive) {
        this.catalog.set(id, { ...value, sourceActive: false, visible: false });
        count += 1;
      }
    }
    return count;
  }

  async removeMissingObservationComments(seen: ReadonlySet<string>) {
    let count = 0;
    for (const uuid of this.importedComments.keys()) {
      if (!seen.has(uuid)) {
        this.importedComments.delete(uuid);
        count += 1;
      }
    }
    return count;
  }

  async completeRun(summary: SyncRunSummary): Promise<void> {
    this.summaries.push(summary);
  }
}

function gateway(overrides: Partial<InaturalistGateway> = {}): InaturalistGateway {
  return {
    async listGuideTaxa() {
      return [guideTaxon];
    },
    async listObservations(afterId) {
      return afterId === undefined
        ? { results: [observation], hasMore: false }
        : { results: [], hasMore: false };
    },
    ...overrides,
  };
}

const clock: ImportClock = { now: () => new Date(now) };

describe('daily iNaturalist synchronization', () => {
  it('backfills both sources idempotently and links a unique exact local name', async () => {
    const repository = new MemoryRepository();
    repository.localCatalog.set('local-mimi', 'Mimi (campus profile)');

    const first = await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-1',
    });
    const second = await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-2',
    });

    assert.equal(first.status, 'success');
    assert.deepEqual(first.observations, {
      fetched: 1,
      created: 1,
      updated: 0,
      deactivated: 0,
      errors: [],
    });
    assert.equal(repository.catalog.get(2113386)?.linkedLocalCatalogId, 'local-mimi');
    assert.equal(second.observations.created, 0);
    assert.equal(second.observations.updated, 1);
    assert.equal(repository.observations.size, 1);
    assert.equal(repository.importedComments.size, 1);
    assert.equal(
      repository.importedComments.get(
        'e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
      )?.body,
      'Pretty sure this is Charles!',
    );
  });

  it('reports ambiguous exact local names and keeps an established link persistent', async () => {
    const ambiguousRepository = new MemoryRepository();
    ambiguousRepository.localCatalog.set('local-mimi-1', 'Mimi');
    ambiguousRepository.localCatalog.set('local-mimi-2', 'Mimi (alias)');
    const ambiguous = await runInaturalistSync({
      gateway: gateway(),
      repository: ambiguousRepository,
      clock,
      runId: () => 'run-ambiguous',
    });
    assert.deepEqual(ambiguous.ambiguousCatalogMatches, [2113386]);
    assert.equal(
      ambiguousRepository.catalog.get(2113386)?.matchStatus,
      'ambiguous',
    );

    const linkedRepository = new MemoryRepository();
    linkedRepository.localCatalog.set('local-mimi-1', 'Mimi');
    await runInaturalistSync({
      gateway: gateway(),
      repository: linkedRepository,
      clock,
      runId: () => 'run-linked',
    });
    linkedRepository.localCatalog.set('local-mimi-2', 'Mimi (alias)');
    await runInaturalistSync({
      gateway: gateway(),
      repository: linkedRepository,
      clock,
      runId: () => 'run-linked-again',
    });
    assert.equal(
      linkedRepository.catalog.get(2113386)?.linkedLocalCatalogId,
      'local-mimi-1',
    );
  });

  it('deactivates missing records only after a complete successful source scan', async () => {
    const repository = new MemoryRepository();
    await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-1',
    });

    const complete = await runInaturalistSync({
      gateway: gateway({
        async listObservations() {
          return { results: [], hasMore: false };
        },
      }),
      repository,
      clock,
      runId: () => 'run-2',
    });
    assert.equal(complete.observations.deactivated, 1);
    assert.equal(repository.observations.get(321)?.visible, false);
    assert.equal(repository.importedComments.size, 0);

    repository.observations.set(321, {
      ...repository.observations.get(321)!,
      sourceActive: true,
      visible: true,
    });
    const failed = await runInaturalistSync({
      gateway: gateway({
        async listObservations() {
          throw new Error('provider unavailable');
        },
      }),
      repository,
      clock,
      runId: () => 'run-3',
    });
    assert.equal(failed.status, 'partial');
    assert.equal(repository.observations.get(321)?.visible, true);
  });

  it('reactivates returned records while preserving moderation, overrides, and links', async () => {
    const repository = new MemoryRepository();
    await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-1',
    });
    const originalObservation = repository.observations.get(321)!;
    const originalCatalog = repository.catalog.get(2113386)!;
    repository.observations.set(321, {
      ...originalObservation,
      sourceActive: false,
      visible: false,
      moderation: { hidden: true, reason: 'Officer review' },
    });
    repository.catalog.set(2113386, {
      ...originalCatalog,
      sourceActive: false,
      visible: false,
      moderation: { hidden: true, reason: 'Duplicate profile' },
      overrides: { descLong: 'Officer-maintained notes' },
      linkedLocalCatalogId: 'local-mimi',
      matchStatus: 'linked',
    });

    await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-2',
    });

    const observationResult = repository.observations.get(321)!;
    const catalogResult = repository.catalog.get(2113386)!;
    assert.equal(observationResult.sourceActive, true);
    assert.equal(observationResult.visible, false);
    assert.equal(observationResult.moderation.reason, 'Officer review');
    assert.equal(catalogResult.sourceActive, true);
    assert.equal(catalogResult.visible, false);
    assert.deepEqual(catalogResult.overrides, {
      descLong: 'Officer-maintained notes',
    });
    assert.equal(catalogResult.linkedLocalCatalogId, 'local-mimi');
  });

  it('replaces edited source fields and revoked media deterministically', async () => {
    const repository = new MemoryRepository();
    await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-1',
    });

    await runInaturalistSync({
      gateway: gateway({
        async listObservations() {
          return {
            results: [
              {
                ...observation,
                description: 'Updated at the source',
                photos: [],
              },
            ],
            hasMore: false,
          };
        },
      }),
      repository,
      clock,
      runId: () => 'run-2',
    });

    assert.equal(
      repository.observations.get(321)?.description,
      'Updated at the source',
    );
    assert.deepEqual(repository.observations.get(321)?.photos, []);
    assert.equal(repository.observations.size, 1);
  });

  it('keeps an imported catalog association stable across guide name edits', async () => {
    const repository = new MemoryRepository();
    await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-1',
    });
    assert.equal(repository.observations.get(321)?.guideTaxonId, 2113386);

    await runInaturalistSync({
      gateway: gateway({
        async listGuideTaxa() {
          return [{ ...guideTaxon, display_name: 'Mimi Renamed' }];
        },
      }),
      repository,
      clock,
      runId: () => 'run-2',
    });

    assert.equal(repository.observations.get(321)?.guideTaxonId, 2113386);
  });

  it('isolates source and batch failures without deactivating unseen records', async () => {
    const repository = new MemoryRepository();
    await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-1',
    });
    repository.failObservationBatch = true;

    const observationBatchFailure = await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-2',
    });
    assert.equal(observationBatchFailure.status, 'partial');
    assert.equal(repository.observations.get(321)?.sourceActive, true);

    repository.failObservationBatch = false;
    const guideFailure = await runInaturalistSync({
      gateway: gateway({
        async listGuideTaxa() {
          throw new Error('guide unavailable');
        },
      }),
      repository,
      clock,
      runId: () => 'run-3',
    });
    assert.equal(guideFailure.status, 'partial');
    assert.equal(guideFailure.observations.updated, 1);
    assert.equal(repository.catalog.get(2113386)?.sourceActive, true);
  });

  it('takes over an expired lease but skips an active overlapping lease', async () => {
    const repository = new MemoryRepository();
    repository.leaseAvailable = false;
    repository.leaseUntil = new Date(now.getTime() - 1);

    const expired = await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-expired',
    });
    assert.equal(expired.status, 'success');

    repository.leaseAvailable = false;
    repository.leaseUntil = new Date(now.getTime() + 60_000);
    const overlapping = await runInaturalistSync({
      gateway: gateway(),
      repository,
      clock,
      runId: () => 'run-overlap',
    });
    assert.equal(overlapping.status, 'skipped');
  });

  it('reports an overlapping invocation without touching either source', async () => {
    const repository = new MemoryRepository();
    repository.leaseAvailable = false;
    repository.leaseUntil = new Date(now.getTime() + 60_000);

    const result = await runInaturalistSync({
      gateway: gateway({
        async listGuideTaxa() {
          throw new Error('must not run');
        },
      }),
      repository,
      clock,
      runId: () => 'run-1',
    });

    assert.equal(result.status, 'skipped');
    assert.equal(repository.summaries.length, 0);
  });
});
