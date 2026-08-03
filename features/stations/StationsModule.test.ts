import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  FixedClock,
  Role,
  SequenceIdGenerator,
  createFirestoreCodecs,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator, storedMedia } from '../../core/media';
import { StationsModule } from './StationsModule';

const admin = parseUser({ id: 'admin-1', email: 'admin@gatech.edu', role: Role.Admin });
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const clock = new FixedClock(new Date('2025-04-15T12:00:00.000Z'));

function buildModule() {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const ids = new SequenceIdGenerator(['station-1', 'profile-1']);
  return {
    module: new StationsModule({
      documents,
      media,
      mediaCoordinator: new MediaCoordinator(media, ids),
      ids,
      clock,
      codecs: createFirestoreCodecs({ fromDate: (date) => date }),
    }),
    documents,
    media,
  };
}

const draft = {
  name: 'Tech Tower Station',
  location: { latitude: 33.772, longitude: -84.394 },
  lastStocked: new Date('2025-04-10T12:00:00.000Z'),
  stockingFreq: 7,
  knownCats: 'Goldie',
  photos: ['file://profile.jpg'],
};

describe('StationsModule', () => {
  it('supports admin CRUD and derives stock status from the injected clock', async () => {
    const { module } = buildModule();
    const created = await module.create(admin, draft);

    expect(created).toMatchObject({ ok: true, value: { id: 'station-1' } });
    expect(created.ok && module.stockStatus(created.value)).toEqual({
      isStocked: true,
      daysRemaining: 2,
    });
    await expect(module.list()).resolves.toMatchObject({
      ok: true,
      value: [{ name: 'Tech Tower Station' }],
    });
    await expect(module.remove(admin, 'station-1')).resolves.toMatchObject({ ok: true });
  });

  it('rejects non-admin mutations and invalid station input', async () => {
    const { module } = buildModule();
    await expect(module.create(undefined, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.create(member, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.create(admin, { ...draft, name: '' })).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message: 'Name field must not be empty' },
    });
    await expect(
      module.create(admin, { ...draft, stockingFreq: 0 }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'validation',
        message: 'Stocking Frequency must be a positive number',
      },
    });
    await expect(
      module.create(admin, { ...draft, lastStocked: new Date('invalid') }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(module.create(admin, { ...draft, photos: [] })).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    await expect(
      module.create(admin, { ...draft, location: { latitude: 0, longitude: 0 } }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
  });

  it('updates station fields and the current editor attribution', async () => {
    const { module, media } = buildModule();
    await module.create(admin, draft);

    const updated = await module.update(admin, 'station-1', {
      ...draft,
      name: 'Updated Station',
      profile: storedMedia(media.ids()[0]),
      gallery: [],
    });

    expect(updated).toMatchObject({
      ok: true,
      value: { name: 'Updated Station', createdBy: { id: 'admin-1' } },
    });
  });

  it('restocks with the injected current time', async () => {
    const { module } = buildModule();
    await module.create(admin, draft);

    const restocked = await module.restock(admin, 'station-1');

    expect(restocked).toMatchObject({
      ok: true,
      value: { lastStocked: new Date('2025-04-15T12:00:00.000Z') },
    });
    expect(restocked.ok && module.stockStatus(restocked.value)).toEqual({
      isStocked: true,
      daysRemaining: 7,
    });
  });

  it('returns not-found and dependency failures', async () => {
    const { module, documents, media } = buildModule();
    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    documents.failNext('list', new Error('offline'));
    await expect(module.list()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    documents.failNext('get', new Error('offline'));
    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    media.failNext('list', new Error('offline'));
    await expect(module.media('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('covers create, update, and restock failure paths', async () => {
    const createFailure = buildModule();
    createFailure.media.failNext('list', new Error('offline'));
    await expect(createFailure.module.create(admin, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const update = {
      ...draft,
      profile: storedMedia('stations/station-1/profile-profile-1.jpg'),
      gallery: [],
    };
    await expect(buildModule().module.update(member, 'missing', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(buildModule().module.update(admin, 'missing', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    const invalid = buildModule();
    await invalid.module.create(admin, draft);
    await expect(
      invalid.module.update(admin, 'station-1', { ...update, name: '' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });

    const mediaFailure = buildModule();
    await mediaFailure.module.create(admin, draft);
    mediaFailure.media.failNext('list', new Error('offline'));
    await expect(mediaFailure.module.update(admin, 'station-1', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    await expect(buildModule().module.restock(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(buildModule().module.restock(admin, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    const restockFailure = buildModule();
    await restockFailure.module.create(admin, draft);
    restockFailure.documents.failNext('put', new Error('offline'));
    await expect(restockFailure.module.restock(admin, 'station-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('covers delete authorization, dependency, and cleanup outcomes', async () => {
    await expect(buildModule().module.remove(undefined, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(buildModule().module.remove(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(buildModule().module.remove(admin, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    const documentFailure = buildModule();
    await documentFailure.module.create(admin, draft);
    documentFailure.documents.failNext('remove', new Error('offline'));
    await expect(documentFailure.module.remove(admin, 'station-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    for (const operation of ['list', 'remove'] as const) {
      const cleanupFailure = buildModule();
      await cleanupFailure.module.create(admin, draft);
      cleanupFailure.media.failNext(operation, new Error('offline'));
      await expect(cleanupFailure.module.remove(admin, 'station-1')).resolves.toMatchObject({
        ok: true,
        warnings: [{ code: 'cleanup_failed' }],
      });
    }
  });
});
