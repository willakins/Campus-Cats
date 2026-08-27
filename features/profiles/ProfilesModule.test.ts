import { InMemoryCallableEffects } from '../../adapters/inMemory/InMemoryCallableEffects';
import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  COLLECTIONS,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parsePublicProfile,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator, localMedia } from '../../core/media';
import { mediaAssetId } from '../../core/ports';
import { ProfilesModule } from './ProfilesModule';

const actor = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const profile = parsePublicProfile({
  id: actor.id,
  displayName: 'Member',
  bio: '',
  profilePhotoUrl: '',
  role: actor.role,
  achievementIds: [],
  selectedTitleId: '',
});
const codecs = createPersistenceCodecs(dateObjectCodec);

async function buildModule() {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const effects = new InMemoryCallableEffects();
  await documents.put(
    COLLECTIONS.publicProfiles,
    actor.id,
    codecs.publicProfile.encode(profile),
  );
  return {
    module: new ProfilesModule({
      documents,
      media,
      effects,
      mediaCoordinator: new MediaCoordinator(
        media,
        new SequenceIdGenerator(['photo-1']),
      ),
      codecs,
    }),
    documents,
    effects,
    media,
  };
}

describe('ProfilesModule', () => {
  it('loads public profiles and synchronizes achievement progress', async () => {
    const { module, effects } = await buildModule();

    await expect(module.get(actor.id)).resolves.toMatchObject({
      ok: true,
      value: { displayName: 'Member' },
    });
    await expect(module.sync(actor)).resolves.toMatchObject({ ok: true });
    await expect(module.getOrSync(actor.id)).resolves.toMatchObject({ ok: true });
    expect(effects.operations).toEqual(['sync-public-profile:member-1']);
  });

  it('creates a missing legacy profile on demand', async () => {
    const { module, documents, effects } = await buildModule();
    await documents.remove(COLLECTIONS.publicProfiles, actor.id);
    jest.spyOn(effects, 'syncPublicProfile').mockImplementation(async () => {
      await documents.put(
        COLLECTIONS.publicProfiles,
        actor.id,
        codecs.publicProfile.encode(profile),
      );
    });

    await expect(module.getOrSync(actor.id)).resolves.toMatchObject({
      ok: true,
      value: { id: actor.id },
    });
  });

  it('keeps an existing profile available when achievement synchronization fails', async () => {
    const { module, documents, effects } = await buildModule();
    effects.failNext('syncPublicProfile', new Error('offline'));

    await expect(module.sync(actor)).resolves.toMatchObject({
      ok: true,
      value: { id: actor.id },
      warnings: [{
        code: 'partial_completion',
        message: 'Could not update profile achievements',
      }],
    });

    await documents.remove(COLLECTIONS.publicProfiles, actor.id);
    effects.failNext('syncPublicProfile', new Error('offline'));
    await expect(module.sync(actor)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('maps profile reads and legacy sync failures without retry loops', async () => {
    const failedRead = await buildModule();
    failedRead.documents.failNext('get', new Error('offline'));
    await expect(failedRead.module.getOrSync(actor.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    expect(failedRead.effects.operations).toEqual([]);

    const failedSync = await buildModule();
    await failedSync.documents.remove(COLLECTIONS.publicProfiles, actor.id);
    failedSync.effects.failNext('syncPublicProfile', new Error('offline'));
    await expect(failedSync.module.getOrSync(actor.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('uploads one owned profile photo and routes profile fields through the callable', async () => {
    const { module, effects, media } = await buildModule();
    const result = await module.update(actor, {
      displayName: 'Cat Watcher',
      bio: 'Tech Tower cat fan',
      photo: localMedia('file://profile.jpg'),
    });

    expect(result).toMatchObject({ ok: true });
    expect(media.ids()).toEqual(['public-profiles/member-1/photo-1.jpg']);
    expect(effects.operations).toEqual([
      'update-public-profile:Cat Watcher:Tech Tower cat fan:memory://public-profiles/member-1/photo-1.jpg',
    ]);
  });

  it('validates edits, title selection, and authentication', async () => {
    const { module, effects } = await buildModule();

    await expect(
      module.update(actor, { displayName: ' ', bio: '' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(
      module.update(undefined, { displayName: 'Member', bio: '' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(
      module.update(actor, { displayName: 'x'.repeat(61), bio: '' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(
      module.update(actor, { displayName: 'Member', bio: 'x'.repeat(501) }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    await expect(module.sync(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.selectTitle(undefined, '')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(
      module.selectTitle(actor, 'first-sighting'),
    ).resolves.toMatchObject({ ok: true });
    expect(effects.operations).toContain(
      'select-profile-title:first-sighting',
    );
  });

  it('supports removing an existing photo', async () => {
    const { module, effects, media } = await buildModule();
    await media.upload({
      id: mediaAssetId('public-profiles/member-1/existing.jpg'),
      localUri: 'file://existing.jpg',
      role: 'gallery',
      ownerId: actor.id,
    });

    await expect(
      module.update(actor, { displayName: 'Member', bio: '', photo: undefined }),
    ).resolves.toMatchObject({ ok: true });
    expect(media.ids()).toEqual([]);
    expect(effects.operations).toContain(
      'update-public-profile:Member::',
    );
  });

  it('maps media and callable failures while editing', async () => {
    const listFailure = await buildModule();
    listFailure.media.failNext('list', new Error('offline'));
    await expect(
      listFailure.module.update(actor, {
        displayName: 'Member',
        bio: '',
        photo: localMedia('file://profile.jpg'),
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const uploadFailure = await buildModule();
    uploadFailure.media.failNext('upload', new Error('offline'));
    await expect(
      uploadFailure.module.update(actor, {
        displayName: 'Member',
        bio: '',
        photo: localMedia('file://profile.jpg'),
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const callableFailure = await buildModule();
    callableFailure.effects.failNext('updatePublicProfile', new Error('offline'));
    await expect(
      callableFailure.module.update(actor, {
        displayName: 'Member',
        bio: '',
        photo: localMedia('file://profile.jpg'),
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });
    expect(callableFailure.media.ids()).toEqual([]);
  });

  it('returns a read failure after an otherwise successful profile edit', async () => {
    const { module, documents } = await buildModule();
    const get = jest.spyOn(documents, 'get');
    get.mockRejectedValueOnce(new Error('offline'));

    await expect(
      module.update(actor, { displayName: 'Member', bio: '' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });
  });

  it('maps title and media dependency failures', async () => {
    const titleFailure = await buildModule();
    titleFailure.effects.failNext('selectProfileTitle', new Error('offline'));
    await expect(
      titleFailure.module.selectTitle(actor, 'first-sighting'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const titleReadFailure = await buildModule();
    titleReadFailure.documents.failNext('get', new Error('offline'));
    await expect(
      titleReadFailure.module.selectTitle(actor, ''),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

    const mediaSuccess = await buildModule();
    await expect(mediaSuccess.module.media(actor.id)).resolves.toMatchObject({
      ok: true,
      value: [],
    });
    mediaSuccess.media.failNext('list', new Error('offline'));
    await expect(mediaSuccess.module.media(actor.id)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
