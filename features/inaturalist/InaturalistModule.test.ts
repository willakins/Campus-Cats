import {
  InMemoryInaturalistEffects,
  InMemoryInaturalistReader,
} from '../../adapters/inMemory/InMemoryInaturalist';
import {
  Role,
  createPersistenceCodecs,
  dateObjectCodec,
  parseImportedCatalogProfile,
  parseImportedObservation,
  parseUser,
} from '../../core/domain';
import { InaturalistModule } from './InaturalistModule';

const admin = parseUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Officer,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const importedAt = new Date('2026-08-04T07:17:00.000Z');

const importedObservation = parseImportedObservation({
  id: 321,
  uuid: 'a1d112b8-954b-4a65-a574-d73092f1cd38',
  projectId: 149475,
  sourceUrl: 'https://www.inaturalist.org/observations/321',
  sourceUpdatedAt: importedAt,
  observedAt: importedAt,
  observedOn: '2026-08-04',
  observedTimePrecision: 'exact',
  displayName: 'Mimi',
  description: '',
  qualityGrade: 'research',
  observer: { id: 42, login: 'observer' },
  location: null,
  positionalAccuracy: null,
  photos: [],
  sourceActive: true,
  visible: true,
  importedAt,
  syncedAt: importedAt,
  lastSeenRunId: 'run-1',
  moderation: { hidden: false },
});
const importedCatalog = parseImportedCatalogProfile({
  id: 2113386,
  guideId: 18800,
  sourceUrl: 'https://www.inaturalist.org/guide_taxa/2113386',
  sourceUpdatedAt: importedAt,
  displayName: 'Mimi',
  shortDescription: 'Black-and-white cat',
  metadata: { yearsRecorded: [], areasOfResidence: [], furPatterns: [] },
  photos: [],
  sourceActive: true,
  visible: true,
  importedAt,
  syncedAt: importedAt,
  lastSeenRunId: 'run-1',
  moderation: { hidden: false },
  overrides: {},
  matchStatus: 'unlinked',
});

function buildModule() {
  const reader = new InMemoryInaturalistReader();
  const effects = new InMemoryInaturalistEffects();
  const codecs = createPersistenceCodecs(dateObjectCodec);
  const module = new InaturalistModule({
    reader,
    effects,
    codecs: {
      observation: codecs.inaturalistObservation,
      catalog: codecs.inaturalistCatalog,
      status: codecs.inaturalistStatus,
    },
  });
  return { module, reader, effects, codecs };
}

describe('InaturalistModule', () => {
  it('requires administrator access for integration operations', async () => {
    const { module } = buildModule();
    for (const operation of [
      () => module.status(undefined),
      () => module.runNow(member),
      () => module.records(member),
      () => module.updateCatalog(member, 2113386, {}),
      () => module.linkCatalog(member, 2113386),
      () =>
        module.setVisibility(
          member,
          'observation',
          321,
          false,
          'Sensitive location',
        ),
    ]) {
      await expect(operation()).resolves.toMatchObject({
        ok: false,
        error: { code: expect.stringMatching(/unauthenticated|forbidden/) },
      });
    }
  });

  it('decodes the latest synchronization status', async () => {
    const { module, reader, codecs } = buildModule();
    const status = {
      running: false,
      lastStatus: 'success' as const,
      runId: 'run-1',
      startedAt: new Date('2026-08-04T07:17:00.000Z'),
      completedAt: new Date('2026-08-04T07:17:05.000Z'),
      observations: {
        lastAttemptAt: new Date('2026-08-04T07:17:00.000Z'),
        lastSuccessAt: new Date('2026-08-04T07:17:05.000Z'),
        fetched: 619,
        created: 619,
        updated: 0,
        deactivated: 0,
        errors: [],
      },
      catalog: {
        lastAttemptAt: new Date('2026-08-04T07:17:00.000Z'),
        lastSuccessAt: new Date('2026-08-04T07:17:05.000Z'),
        fetched: 62,
        created: 62,
        updated: 0,
        deactivated: 0,
        errors: [],
      },
      ambiguousCatalogMatches: [2113399],
    };
    reader.status = {
      id: 'inaturalist',
      data: codecs.inaturalistStatus.encode(status),
    };

    await expect(module.status(admin)).resolves.toMatchObject({
      ok: true,
      value: {
        lastStatus: 'success',
        observations: { fetched: 619 },
        catalog: { fetched: 62 },
        ambiguousCatalogMatches: [2113399],
      },
    });
  });

  it('returns an empty status before the first synchronization', async () => {
    const { module } = buildModule();

    await expect(module.status(admin)).resolves.toEqual({
      ok: true,
      value: undefined,
      warnings: [],
    });
  });

  it('decodes imported audit records from both sources', async () => {
    const { module, reader, codecs } = buildModule();
    reader.observations.set(
      '321',
      codecs.inaturalistObservation.encode(importedObservation),
    );
    reader.catalog.set(
      '2113386',
      codecs.inaturalistCatalog.encode(importedCatalog),
    );

    await expect(module.records(admin)).resolves.toMatchObject({
      ok: true,
      value: {
        observations: [{ id: 321, displayName: 'Mimi' }],
        catalog: [{ id: 2113386, displayName: 'Mimi' }],
      },
    });
  });

  it('runs, moderates, overrides, and links through callable effects', async () => {
    const { module, effects } = buildModule();

    await expect(module.runNow(admin)).resolves.toMatchObject({ ok: true });
    await expect(
      module.setVisibility(
        admin,
        'observation',
        321,
        false,
        'Sensitive location',
      ),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      module.updateCatalog(admin, 2113386, { behavior: 'Cautious' }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      module.linkCatalog(admin, 2113386, 'local-mimi'),
    ).resolves.toMatchObject({ ok: true });

    expect(effects.operations).toEqual([
      'sync',
      'moderate:observation:321:true:Sensitive location',
      'override:2113386:{"behavior":"Cautious"}',
      'link:2113386:local-mimi',
    ]);
  });

  it('reports partial manual synchronization as a typed warning', async () => {
    const { module, effects } = buildModule();
    effects.syncResult = { status: 'partial', runId: 'run-partial' };

    await expect(module.runNow(admin)).resolves.toEqual({
      ok: true,
      value: { status: 'partial', runId: 'run-partial' },
      warnings: [
        {
          code: 'partial_completion',
          message: 'iNaturalist synchronization finished with status partial',
        },
      ],
    });
  });

  it('maps reader and callable failures to typed dependency outcomes', async () => {
    const { module, reader, effects } = buildModule();
    reader.failNext('getStatus', new Error('offline'));
    await expect(module.status(admin)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    effects.failNext('runSync', new Error('offline'));
    await expect(module.runNow(admin)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    reader.failNext('listCatalog', new Error('offline'));
    await expect(module.records(admin)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    effects.failNext('moderate', new Error('offline'));
    await expect(
      module.setVisibility(admin, 'observation', 321, true, ''),
    ).resolves.toMatchObject({
      ok: false,
      error: { message: expect.stringContaining('restore') },
    });
    effects.failNext('moderate', new Error('offline'));
    await expect(
      module.setVisibility(admin, 'observation', 321, false, 'Duplicate'),
    ).resolves.toMatchObject({
      ok: false,
      error: { message: expect.stringContaining('hide') },
    });

    effects.failNext('updateCatalogOverrides', new Error('offline'));
    await expect(
      module.updateCatalog(admin, 2113386, { behavior: 'Cautious' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    effects.failNext('linkCatalog', new Error('offline'));
    await expect(
      module.linkCatalog(admin, 2113386, 'local-mimi'),
    ).resolves.toMatchObject({
      ok: false,
      error: { message: expect.stringContaining('link') },
    });
    effects.failNext('linkCatalog', new Error('offline'));
    await expect(module.linkCatalog(admin, 2113386)).resolves.toMatchObject({
      ok: false,
      error: { message: expect.stringContaining('unlink') },
    });
  });
});
