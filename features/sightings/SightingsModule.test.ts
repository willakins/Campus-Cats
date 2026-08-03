import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  FixedClock,
  Role,
  SequenceIdGenerator,
  createFirestoreCodecs,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator, localMedia, storedMedia } from '../../core/media';
import { SightingsModule, filterSightingsByAge } from './SightingsModule';

const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const otherMember = parseUser({
  id: 'member-2',
  email: 'other@gatech.edu',
  role: Role.Member,
});

function buildModule(ids: readonly string[] = ['sighting-1', 'profile-1']) {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const generator = new SequenceIdGenerator(ids);
  const module = new SightingsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, generator),
    ids: generator,
    codecs: createFirestoreCodecs({ fromDate: (date) => date }),
  });
  return { module, documents, media };
}

const validDraft = {
  name: 'Goldie',
  info: 'Near Tech Tower',
  fed: true,
  health: true,
  date: new Date('2025-04-10T12:00:00.000Z'),
  location: { latitude: 33.772, longitude: -84.394 },
  timeOfDay: 'Afternoon',
  photos: ['file://profile.jpg'],
};

describe('SightingsModule', () => {
  it('creates and retrieves a sighting through its public interface', async () => {
    const { module, media } = buildModule();

    const created = await module.create(member, validDraft);

    expect(created).toMatchObject({
      ok: true,
      value: {
        id: 'sighting-1',
        name: 'Goldie',
        createdBy: { id: 'member-1' },
      },
    });
    await expect(module.get('sighting-1')).resolves.toEqual(created);
    expect(media.ids()).toEqual([
      'cat-sightings/sighting-1/profile-profile-1.jpg',
    ]);
  });

  it.each([
    [{ ...validDraft, name: '' }, 'Please enter a name for the cat.'],
    [
      { ...validDraft, location: { latitude: 0, longitude: 0 } },
      'Please select a location on the map.',
    ],
    [
      { ...validDraft, timeOfDay: '' },
      'Please select a time of day for the sighting.',
    ],
    [{ ...validDraft, photos: [] }, 'Please select a photo.'],
  ])('rejects invalid create input', async (draft, message) => {
    const { module } = buildModule();

    await expect(module.create(member, draft)).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message },
    });
  });

  it('requires authentication and creator ownership for mutations', async () => {
    const { module } = buildModule([
      'sighting-1',
      'profile-1',
      'replacement-1',
    ]);
    await module.create(member, validDraft);

    await expect(module.create(undefined, validDraft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(
      module.update(otherMember, 'sighting-1', {
        ...validDraft,
        profile: localMedia('file://replacement.jpg'),
        gallery: [],
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      module.remove(otherMember, 'sighting-1'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });

  it('updates content without changing the original creator', async () => {
    const { module, media } = buildModule([
      'sighting-1',
      'profile-1',
      'replacement-1',
    ]);
    const created = await module.create(member, validDraft);
    expect(created.ok).toBe(true);
    const profileId = media.ids()[0];

    const updated = await module.update(member, 'sighting-1', {
      ...validDraft,
      name: 'Goldie II',
      profile: storedMedia(profileId),
      gallery: [],
    });

    expect(updated).toMatchObject({
      ok: true,
      value: {
        name: 'Goldie II',
        createdBy: { id: 'member-1' },
      },
    });
  });

  it('returns not-found and dependency failures without throwing', async () => {
    const { module, documents, media } = buildModule();

    await expect(module.get('missing')).resolves.toEqual({
      ok: false,
      error: { code: 'not_found', message: 'Sighting not found' },
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

  it('deletes the document and its media for the creator', async () => {
    const { module } = buildModule();
    await module.create(member, validDraft);

    await expect(module.remove(member, 'sighting-1')).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.get('sighting-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    await expect(module.media('sighting-1')).resolves.toMatchObject({
      ok: true,
      value: [],
    });
  });

  it('covers update authentication, not-found, validation, and media failures', async () => {
    const update = {
      ...validDraft,
      profile: storedMedia('cat-sightings/sighting-1/profile-profile-1.jpg'),
      gallery: [],
    };
    await expect(buildModule().module.update(undefined, 'missing', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(buildModule().module.update(member, 'missing', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    const invalid = buildModule();
    await invalid.module.create(member, validDraft);
    await expect(
      invalid.module.update(member, 'sighting-1', { ...update, name: '' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });

    const failed = buildModule();
    await failed.module.create(member, validDraft);
    failed.media.failNext('list', new Error('offline'));
    await expect(failed.module.update(member, 'sighting-1', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('maps create and delete adapter failures to typed outcomes', async () => {
    const createFailure = buildModule();
    createFailure.media.failNext('list', new Error('offline'));
    await expect(createFailure.module.create(member, validDraft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    await expect(buildModule().module.remove(undefined, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(buildModule().module.remove(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    const mediaDeleteFailure = buildModule();
    await mediaDeleteFailure.module.create(member, validDraft);
    mediaDeleteFailure.media.failNext('remove', new Error('offline'));
    await expect(mediaDeleteFailure.module.remove(member, 'sighting-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'partial_failure' },
    });

    const mediaListFailure = buildModule();
    await mediaListFailure.module.create(member, validDraft);
    mediaListFailure.media.failNext('list', new Error('offline'));
    await expect(mediaListFailure.module.remove(member, 'sighting-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const documentFailure = buildModule();
    await documentFailure.module.create(member, validDraft);
    documentFailure.documents.failNext('remove', new Error('offline'));
    await expect(documentFailure.module.remove(member, 'sighting-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'partial_failure' },
    });
  });
});

describe('sighting age filters', () => {
  it('uses an injected clock and keeps the all-time view', () => {
    const clock = new FixedClock(new Date('2025-04-15T12:00:00.000Z'));
    const sightings = [
      { date: new Date('2025-04-10T12:00:00.000Z') },
      { date: new Date('2025-03-01T12:00:00.000Z') },
    ];

    expect(filterSightingsByAge(sightings, 7, clock)).toHaveLength(1);
    expect(filterSightingsByAge(sightings, undefined, clock)).toHaveLength(2);
  });
});
