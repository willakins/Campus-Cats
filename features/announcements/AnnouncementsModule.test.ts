import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  COLLECTIONS,
  FixedClock,
  Role,
  SequenceIdGenerator,
  createFirestoreCodecs,
  parseAnnouncement,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator, localMedia } from '../../core/media';
import { CallableEffects } from '../../core/ports';
import { AnnouncementsModule } from './AnnouncementsModule';

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
const now = new Date('2025-04-15T12:00:00.000Z');
const clock = new FixedClock(now);
const codecs = createFirestoreCodecs({ fromDate: (date) => date });

function buildModule(effects?: Partial<CallableEffects>) {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const callableEffects: CallableEffects = {
    notifyAnnouncement: jest.fn().mockResolvedValue(undefined),
    provisionWhitelistUser: jest.fn(),
    emailWhitelistCredentials: jest.fn(),
    removeProvisionedUser: jest.fn(),
    ...effects,
  };
  const ids = new SequenceIdGenerator([
    'announcement-1',
    'media-1',
    'media-2',
    'media-3',
  ]);
  return {
    module: new AnnouncementsModule({
      documents,
      media,
      mediaCoordinator: new MediaCoordinator(media, ids),
      effects: callableEffects,
      ids,
      clock,
      codecs,
    }),
    documents,
    media,
    effects: callableEffects,
  };
}

const draft = {
  title: 'Feeding station workday',
  info: 'Meet at Tech Tower at noon.',
  authorAlias: 'Campus Cats Team',
  photos: [] as string[],
};

describe('AnnouncementsModule', () => {
  it('lists announcements newest first and loads details by ID', async () => {
    const { module, documents } = buildModule();
    const older = parseAnnouncement({
      id: 'older',
      ...draft,
      createdAt: new Date('2025-04-01T12:00:00.000Z'),
      createdBy: admin,
    });
    const newer = parseAnnouncement({
      id: 'newer',
      ...draft,
      title: 'Newer update',
      createdAt: new Date('2025-04-10T12:00:00.000Z'),
      createdBy: admin,
    });
    await documents.put(COLLECTIONS.announcements, older.id, codecs.announcement.encode(older));
    await documents.put(COLLECTIONS.announcements, newer.id, codecs.announcement.encode(newer));

    await expect(module.list()).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'newer' }, { id: 'older' }],
    });
    await expect(module.get('older')).resolves.toMatchObject({
      ok: true,
      value: { title: 'Feeding station workday' },
    });
  });

  it('persists before best-effort notification and reports delivery failure as a warning', async () => {
    let documents: InMemoryDocumentStore;
    const notifyAnnouncement = jest.fn(async () => {
      const stored = await documents.get(COLLECTIONS.announcements, 'announcement-1');
      expect(stored).toBeDefined();
      throw new Error('push provider unavailable');
    });
    const built = buildModule({ notifyAnnouncement });
    documents = built.documents;

    const result = await built.module.create(admin, draft);

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        id: 'announcement-1',
        createdAt: now,
      }),
      warnings: [
        {
          code: 'notification_failed',
          message: 'Announcement saved, but push notification delivery failed',
        },
      ],
    });
    expect(notifyAnnouncement).toHaveBeenCalledWith({
      title: draft.title,
      body: draft.info,
    });
  });

  it('allows optional media and reconciles media on update', async () => {
    const { module, media } = buildModule();
    const created = await module.create(admin, draft);
    expect(created).toMatchObject({ ok: true });
    await expect(module.media('announcement-1')).resolves.toEqual({
      ok: true,
      value: [],
      warnings: [],
    });

    const updated = await module.update(admin, 'announcement-1', {
      title: 'Updated workday',
      info: draft.info,
      authorAlias: draft.authorAlias,
      photos: [localMedia('file://updated.jpg')],
    });

    expect(updated).toMatchObject({
      ok: true,
      value: { title: 'Updated workday', createdAt: now },
    });
    expect(media.ids()).toEqual([
      'announcements/announcement-1/media-1.jpg',
    ]);
  });

  it('rejects unauthorized and invalid mutations', async () => {
    const { module } = buildModule();
    await expect(module.create(undefined, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.create(member, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.create(admin, { ...draft, title: ' ' })).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message: 'Title cannot be empty.' },
    });
    await expect(module.create(admin, { ...draft, info: '' })).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message: 'Description cannot be empty.' },
    });
  });

  it('returns dependency, not-found, and cleanup outcomes', async () => {
    const { module, documents, media } = buildModule();
    documents.failNext('list', new Error('offline'));
    await expect(module.list()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    await module.create(admin, { ...draft, photos: ['file://one.jpg'] });
    media.failNext('remove', new Error('storage offline'));
    await expect(module.remove(admin, 'announcement-1')).resolves.toMatchObject({
      ok: true,
      warnings: [{ code: 'cleanup_failed' }],
    });
  });
});
