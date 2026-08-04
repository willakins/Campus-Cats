import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CatalogImport,
  ImportClock,
  ImportRepository,
  InaturalistHttpGateway,
  InaturalistGateway,
  ObservationImport,
  SyncRunSummary,
  mapGuideTaxon,
  mapObservation,
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
  user: { id: 42, login: 'observer', name: 'Observer' },
};

describe('iNaturalist mappers', () => {
  it('maps every quality grade while filtering unlicensed media', () => {
    const result = mapObservation(
      observation,
      new Map([['mimi', 2113386]]),
      now,
      'run-1',
    );

    assert.equal(result.qualityGrade, 'casual');
    assert.deepEqual(result.location, {
      latitude: 33.776,
      longitude: -84.396,
    });
    assert.equal(result.guideTaxonId, 2113386);
    assert.equal(result.photos.length, 1);
    assert.equal(result.photos[0].role, 'profile');
    assert.match(result.photos[0].url, /\/large\.jpg$/);
    assert.match(result.photos[0].thumbnailUrl, /\/small\.jpg$/);
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
    assert.match(
      requests[0].headers?.['User-Agent'] ?? '',
      /Campus-Cats/,
    );
    assert.ok(delays.includes(2000));
  });
});

class MemoryRepository implements ImportRepository {
  readonly observations = new Map<number, ObservationImport>();
  readonly catalog = new Map<number, CatalogImport>();
  readonly localCatalog = new Map<string, string>();
  summaries: SyncRunSummary[] = [];
  leaseAvailable = true;

  async acquireLease(): Promise<boolean> {
    if (!this.leaseAvailable) return false;
    this.leaseAvailable = false;
    return true;
  }

  async releaseLease(): Promise<void> {
    this.leaseAvailable = true;
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
    let created = 0;
    let updated = 0;
    for (const value of values) {
      if (this.observations.has(value.id)) updated += 1;
      else created += 1;
      this.observations.set(value.id, value);
    }
    return { created, updated };
  }

  async upsertCatalog(values: readonly CatalogImport[]) {
    let created = 0;
    let updated = 0;
    for (const value of values) {
      if (this.catalog.has(value.id)) updated += 1;
      else created += 1;
      this.catalog.set(value.id, value);
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

  it('reports an overlapping invocation without touching either source', async () => {
    const repository = new MemoryRepository();
    repository.leaseAvailable = false;

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
