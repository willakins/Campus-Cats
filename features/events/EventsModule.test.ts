import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  COLLECTIONS,
  FixedClock,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parseClubEvent,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator, storedMedia } from '../../core/media';
import { EventsModule } from './EventsModule';

const now = new Date('2026-08-06T12:00:00.000Z');
const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const codecs = createPersistenceCodecs(dateObjectCodec);

function buildModule(ids: readonly string[] = ['event-1', 'image-1']) {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const generator = new SequenceIdGenerator(ids);
  return {
    module: new EventsModule({
      documents,
      media,
      mediaCoordinator: new MediaCoordinator(media, generator),
      ids: generator,
      clock: new FixedClock(now),
      codec: codecs.clubEvent,
    }),
    documents,
    media,
  };
}

const draft = {
  title: 'Fall feeding workshop',
  details: 'Learn how to safely support the campus colonies.',
  location: 'Student Center, Cypress Room',
  startsAt: new Date('2026-08-10T17:00:00.000Z'),
  expiresAt: new Date('2026-08-11T03:59:59.999Z'),
  imageLocalUri: 'file://event.jpg',
};

describe('EventsModule', () => {
  it('requires authentication to list or inspect events', async () => {
    const { module } = buildModule();

    await expect(module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.get(undefined, 'event-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
  });

  it('lets officers create image-backed events that members can view', async () => {
    const { module, media } = buildModule();

    await expect(module.create(officer, draft)).resolves.toMatchObject({
      ok: true,
      value: {
        id: 'event-1',
        title: draft.title,
        imageUrl: 'memory://community-events/event-1/profile-image-1.jpg',
        createdBy: { id: officer.id },
      },
    });
    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'event-1' }],
    });
    expect(media.ids()).toEqual([
      'community-events/event-1/profile-image-1.jpg',
    ]);
  });

  it('hides expired events from members while retaining officer history', async () => {
    const { module, documents } = buildModule();
    const expired = parseClubEvent({
      id: 'expired',
      ...draft,
      imageUrl: 'https://example.com/event.jpg',
      startsAt: new Date('2026-08-01T12:00:00.000Z'),
      expiresAt: new Date('2026-08-05T23:59:59.999Z'),
      createdAt: now,
      createdBy: officer,
    });
    await documents.put(COLLECTIONS.events, expired.id, codecs.clubEvent.encode(expired));

    await expect(module.list(member)).resolves.toMatchObject({ ok: true, value: [] });
    await expect(module.get(member, expired.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    await expect(module.list(officer)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'expired' }],
    });
  });

  it('sorts upcoming events by event date and reports missing records', async () => {
    const { module, documents } = buildModule();
    const event = (id: string, startsAt: string) =>
      parseClubEvent({
        id,
        ...draft,
        imageUrl: `https://example.com/${id}.jpg`,
        startsAt: new Date(startsAt),
        createdAt: now,
        createdBy: officer,
      });
    const later = event('later', '2026-08-12T12:00:00.000Z');
    const earlier = event('earlier', '2026-08-09T12:00:00.000Z');
    await documents.put(COLLECTIONS.events, later.id, codecs.clubEvent.encode(later));
    await documents.put(COLLECTIONS.events, earlier.id, codecs.clubEvent.encode(earlier));

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'earlier' }, { id: 'later' }],
    });
    await expect(module.get(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    documents.failNext('get', new Error('offline'));
    await expect(module.get(member, 'later')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('keeps valid events available when a stored definition is malformed', async () => {
    const { module, documents } = buildModule();
    const valid = parseClubEvent({
      id: 'valid',
      ...draft,
      imageUrl: 'https://example.com/event.jpg',
      createdAt: now,
      createdBy: officer,
    });
    await documents.put(COLLECTIONS.events, valid.id, codecs.clubEvent.encode(valid));
    await documents.put(COLLECTIONS.events, 'invalid', {
      title: 'Broken',
      startsAt: 'not-a-date',
    });

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'valid' }],
      warnings: [{ code: 'partial_completion' }],
    });
  });

  it('requires officer access, valid dates, and a picture', async () => {
    await expect(buildModule().module.create(undefined, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(buildModule().module.create(member, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      buildModule().module.create(officer, { ...draft, imageLocalUri: '' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation', message: 'An event picture is required.' },
    });
    await expect(
      buildModule().module.create(officer, {
        ...draft,
        expiresAt: new Date('2026-08-09T12:00:00.000Z'),
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
  });

  it.each([
    [{ ...draft, title: ' ' }, 'Event title cannot be empty.'],
    [
      { ...draft, title: 'x'.repeat(121) },
      'Event title must be 120 characters or fewer.',
    ],
    [{ ...draft, details: '' }, 'Event details cannot be empty.'],
    [
      { ...draft, details: 'x'.repeat(5001) },
      'Event details must be 5,000 characters or fewer.',
    ],
    [{ ...draft, location: '' }, 'Event location cannot be empty.'],
    [
      { ...draft, location: 'x'.repeat(301) },
      'Event location must be 300 characters or fewer.',
    ],
    [
      { ...draft, startsAt: new Date('invalid') },
      'Choose valid event and expiration dates.',
    ],
    [
      { ...draft, expiresAt: new Date('invalid') },
      'Choose valid event and expiration dates.',
    ],
  ])('validates every required event field', async (invalidDraft, message) => {
    await expect(buildModule().module.create(officer, invalidDraft)).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message },
    });
  });

  it('reconciles updates and cleans up event media on deletion', async () => {
    const { module, media } = buildModule();
    await module.create(officer, draft);

    await expect(
      module.update(officer, 'event-1', {
        ...draft,
        title: 'Updated workshop',
        image: storedMedia('community-events/event-1/profile-image-1.jpg'),
      }),
    ).resolves.toMatchObject({ ok: true, value: { title: 'Updated workshop' } });
    await expect(module.remove(officer, 'event-1')).resolves.toMatchObject({ ok: true });
    expect(media.ids()).toEqual([]);
  });

  it('covers update and delete authorization, missing records, and validation', async () => {
    const update = { ...draft, image: storedMedia('missing') };
    await expect(
      buildModule().module.update(undefined, 'event-1', update),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      buildModule().module.update(member, 'event-1', update),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      buildModule().module.update(officer, 'event-1', { ...update, title: '' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(
      buildModule().module.update(officer, 'event-1', update),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });

    await expect(
      buildModule().module.remove(undefined, 'event-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      buildModule().module.remove(member, 'event-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      buildModule().module.remove(officer, 'event-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('maps storage and document failures to typed outcomes', async () => {
    const uploadFailure = buildModule();
    uploadFailure.media.failNext('upload', new Error('offline'));
    await expect(uploadFailure.module.create(officer, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const listFailure = buildModule();
    listFailure.documents.failNext('list', new Error('offline'));
    await expect(listFailure.module.list(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const persistFailure = buildModule();
    persistFailure.documents.failNext('put', new Error('offline'));
    await expect(persistFailure.module.create(officer, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const updateFailure = buildModule();
    await updateFailure.module.create(officer, draft);
    updateFailure.media.failNext('list', new Error('offline'));
    await expect(
      updateFailure.module.update(officer, 'event-1', {
        ...draft,
        image: storedMedia('community-events/event-1/profile-image-1.jpg'),
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });
  });

  it('reports delete and media cleanup failures without restoring deleted events', async () => {
    const deleteFailure = buildModule();
    await deleteFailure.module.create(officer, draft);
    deleteFailure.documents.failNext('remove', new Error('offline'));
    await expect(
      deleteFailure.module.remove(officer, 'event-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const removeFailure = buildModule();
    await removeFailure.module.create(officer, draft);
    removeFailure.media.failNext('remove', new Error('offline'));
    await expect(
      removeFailure.module.remove(officer, 'event-1'),
    ).resolves.toMatchObject({ ok: true, warnings: [{ code: 'cleanup_failed' }] });

    const listFailure = buildModule();
    await listFailure.module.create(officer, draft);
    listFailure.media.failNext('list', new Error('offline'));
    await expect(
      listFailure.module.remove(officer, 'event-1'),
    ).resolves.toMatchObject({ ok: true, warnings: [{ code: 'cleanup_failed' }] });
  });
});
