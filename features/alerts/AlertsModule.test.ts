import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  COLLECTIONS,
  FixedClock,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parseAlert,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator, localMedia } from '../../core/media';
import { ApplicationEffects } from '../../core/ports';
import { AlertsModule } from './AlertsModule';

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
const now = new Date('2025-04-15T12:00:00.000Z');
const clock = new FixedClock(now);
const codecs = createPersistenceCodecs(dateObjectCodec);

function buildModule(effects?: Partial<ApplicationEffects>) {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const callableEffects: ApplicationEffects = {
    notifyAlert: jest.fn().mockResolvedValue(undefined),
    provisionWhitelistUser: jest.fn(),
    emailWhitelistCredentials: jest.fn(),
    removeProvisionedUser: jest.fn(),
    updateUserRole: jest.fn(),
    addDisciplinaryNotice: jest.fn(),
    setUserBanned: jest.fn(),
    transferPresidency: jest.fn(),
    removeUser: jest.fn(),
    deleteOwnAccount: jest.fn(),
    syncPublicProfile: jest.fn(),
    updatePublicProfile: jest.fn(),
    selectProfileTitle: jest.fn(),
    migrateContributorPrivacy: jest.fn(),
    beginInaturalistAccountLink: jest.fn(),
    getInaturalistAccountLinkStatus: jest.fn(),
    unlinkInaturalistAccount: jest.fn(),
    ...effects,
  };
  const ids = new SequenceIdGenerator([
    'alert-1',
    'media-1',
    'media-2',
    'media-3',
  ]);
  return {
    module: new AlertsModule({
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

describe('AlertsModule', () => {
  it('starts the member receipt query while the alert query is still pending', async () => {
    const { module, documents } = buildModule();
    let resolve!: (value: []) => void;
    jest.spyOn(documents, 'list').mockReturnValueOnce(
      new Promise((yes) => {
        resolve = yes;
      }),
    );
    const receipts = jest.spyOn(documents, 'listWhereEqual');
    const result = module.list(member);
    expect(receipts).toHaveBeenCalledWith(
      COLLECTIONS.alertReadReceipts,
      'userId',
      member.id,
    );
    resolve([]);
    await expect(result).resolves.toMatchObject({ ok: true, value: [] });
  });

  it('lists alerts newest first and loads details by ID', async () => {
    const { module, documents } = buildModule();
    const older = parseAlert({
      id: 'older',
      ...draft,
      createdAt: new Date('2025-04-01T12:00:00.000Z'),
      createdBy: admin,
    });
    const newer = parseAlert({
      id: 'newer',
      ...draft,
      title: 'Newer update',
      createdAt: new Date('2025-04-10T12:00:00.000Z'),
      createdBy: admin,
    });
    await documents.put(
      COLLECTIONS.alerts,
      older.id,
      codecs.alert.encode(older),
    );
    await documents.put(
      COLLECTIONS.alerts,
      newer.id,
      codecs.alert.encode(newer),
    );

    await expect(module.list(admin)).resolves.toMatchObject({
      ok: true,
      value: [
        { id: 'newer', read: false },
        { id: 'older', read: false },
      ],
    });
    await expect(module.get('older')).resolves.toMatchObject({
      ok: true,
      value: { title: 'Feeding station workday' },
    });
  });

  it('lists read status for the current member and records reads idempotently', async () => {
    const { module, documents } = buildModule();
    const alert = parseAlert({
      id: 'alert-1',
      ...draft,
      createdAt: now,
      createdBy: admin,
    });
    await documents.put(
      COLLECTIONS.alerts,
      alert.id,
      codecs.alert.encode(alert),
    );

    await expect(module.markRead(member, alert.id)).resolves.toEqual({
      ok: true,
      value: undefined,
      warnings: [],
    });
    await expect(
      module.markRead(member, alert.id),
    ).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: alert.id, read: true }],
    });
    await expect(module.list(admin)).resolves.toMatchObject({
      ok: true,
      value: [{ id: alert.id, read: false }],
    });
    await expect(
      documents.get(
        COLLECTIONS.alertReadReceipts,
        `${member.id}__${alert.id}`,
      ),
    ).resolves.toMatchObject({
      data: {
        userId: member.id,
        alertId: alert.id,
        readAt: now,
      },
    });
  });

  it('rejects anonymous read tracking and reports receipt failures', async () => {
    const { module, documents } = buildModule();

    await expect(module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(
      module.markRead(undefined, 'alert-1'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.markRead(member, ' ')).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    documents.failNext('put', new Error('offline'));
    await expect(
      module.markRead(member, 'alert-1'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('keeps alerts available when read receipts cannot be loaded', async () => {
    const { module, documents } = buildModule();
    const alert = parseAlert({
      id: 'alert-1',
      ...draft,
      createdAt: now,
      createdBy: admin,
    });
    await documents.put(
      COLLECTIONS.alerts,
      alert.id,
      codecs.alert.encode(alert),
    );
    documents.failNext('listWhereEqual', new Error('permission denied'));

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: alert.id, read: false }],
      warnings: [{ code: 'partial_completion' }],
    });
  });

  it('persists before best-effort notification and reports delivery failure as a warning', async () => {
    let documents: InMemoryDocumentStore;
    const notifyAlert = jest.fn(async () => {
      const stored = await documents.get(
        COLLECTIONS.alerts,
        'alert-1',
      );
      expect(stored).toBeDefined();
      throw new Error('push provider unavailable');
    });
    const built = buildModule({ notifyAlert });
    documents = built.documents;

    const result = await built.module.create(admin, draft);

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        id: 'alert-1',
        createdAt: now,
      }),
      warnings: [
        {
          code: 'notification_failed',
          message: 'Alert saved, but push notification delivery failed',
        },
      ],
    });
    expect(notifyAlert).toHaveBeenCalledWith({
      title: draft.title,
      body: draft.info,
    });
  });

  it('allows optional media and reconciles media on update', async () => {
    const { module, media } = buildModule();
    const created = await module.create(admin, draft);
    expect(created).toMatchObject({ ok: true });
    await expect(module.media('alert-1')).resolves.toEqual({
      ok: true,
      value: [],
      warnings: [],
    });

    const updated = await module.update(admin, 'alert-1', {
      title: 'Updated workday',
      info: draft.info,
      authorAlias: draft.authorAlias,
      photos: [localMedia('file://updated.jpg')],
    });

    expect(updated).toMatchObject({
      ok: true,
      value: { title: 'Updated workday', createdAt: now },
    });
    expect(media.ids()).toEqual(['alerts/alert-1/media-1.jpg']);
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
    await expect(
      module.create(admin, { ...draft, title: ' ' }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message: 'Title cannot be empty.' },
    });
    await expect(module.create(admin, { ...draft, info: '' })).resolves.toEqual(
      {
        ok: false,
        error: { code: 'validation', message: 'Description cannot be empty.' },
      },
    );
  });

  it('returns dependency, not-found, and cleanup outcomes', async () => {
    const { module, documents, media } = buildModule();
    documents.failNext('list', new Error('offline'));
    await expect(module.list(admin)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    await module.create(admin, { ...draft, photos: ['file://one.jpg'] });
    media.failNext('remove', new Error('storage offline'));
    await expect(module.remove(admin, 'alert-1')).resolves.toMatchObject(
      {
        ok: true,
        warnings: [{ code: 'cleanup_failed' }],
      },
    );
  });

  it('covers update authorization, validation, not-found, and media failures', async () => {
    await expect(
      buildModule().module.update(member, 'missing', {
        title: draft.title,
        info: draft.info,
        authorAlias: '',
        photos: [],
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      buildModule().module.update(admin, 'missing', {
        title: draft.title,
        info: draft.info,
        authorAlias: '',
        photos: [],
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });

    const invalid = buildModule();
    await invalid.module.create(admin, draft);
    await expect(
      invalid.module.update(admin, 'alert-1', {
        title: '',
        info: draft.info,
        authorAlias: '',
        photos: [],
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });

    const failed = buildModule();
    await failed.module.create(admin, draft);
    failed.media.failNext('list', new Error('storage offline'));
    await expect(
      failed.module.update(admin, 'alert-1', {
        title: draft.title,
        info: draft.info,
        authorAlias: '',
        photos: [],
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('covers create and delete dependency paths', async () => {
    const createFailure = buildModule();
    createFailure.media.failNext('list', new Error('storage offline'));
    await expect(
      createFailure.module.create(admin, draft),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    await expect(
      buildModule().module.remove(member, 'missing'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      buildModule().module.remove(admin, 'missing'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });

    const documentFailure = buildModule();
    await documentFailure.module.create(admin, draft);
    documentFailure.documents.failNext('remove', new Error('offline'));
    await expect(
      documentFailure.module.remove(admin, 'alert-1'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const listFailure = buildModule();
    await listFailure.module.create(admin, draft);
    listFailure.media.failNext('list', new Error('offline'));
    await expect(
      listFailure.module.remove(admin, 'alert-1'),
    ).resolves.toMatchObject({
      ok: true,
      warnings: [{ code: 'cleanup_failed' }],
    });
  });
});
