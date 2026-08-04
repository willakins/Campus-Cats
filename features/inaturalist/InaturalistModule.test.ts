import {
  InMemoryInaturalistEffects,
  InMemoryInaturalistReader,
} from '../../adapters/inMemory/InMemoryInaturalist';
import {
  Role,
  createFirestoreCodecs,
  parseUser,
} from '../../core/domain';
import { InaturalistModule } from './InaturalistModule';

const admin = parseUser({
  id: 'admin-1',
  email: 'admin@gatech.edu',
  role: Role.Admin,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});

function buildModule() {
  const reader = new InMemoryInaturalistReader();
  const effects = new InMemoryInaturalistEffects();
  const codecs = createFirestoreCodecs({ fromDate: (date) => date });
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
  });
});
