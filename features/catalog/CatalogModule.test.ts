import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import { InMemoryInaturalistReader } from '../../adapters/inMemory/InMemoryInaturalist';
import {
  FixedClock,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  DEFAULT_APP_SETTINGS,
  parseUser,
} from '../../core/domain';
import { MediaCoordinator, storedMedia } from '../../core/media';
import { CatalogModule } from './CatalogModule';
import { ContentContributors } from '../appSettings';

const admin = parseUser({ id: 'admin-1', email: 'admin@gatech.edu', role: Role.Officer });
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const cat = {
  name: 'Goldie',
  descShort: 'Friendly orange cat',
  descLong: 'Often seen around central campus.',
  colorPattern: 'Orange',
  behavior: 'Friendly',
  yearsRecorded: '2024-2025',
  AoR: 'Tech Tower',
  currentStatus: 'Feral' as const,
  furLength: 'Short' as const,
  furPattern: 'Tabby',
  tnr: 'Yes' as const,
  sex: 'Female' as const,
};

function buildModule() {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const ids = new SequenceIdGenerator(['cat-1', 'profile-1']);
  const imports = new InMemoryInaturalistReader();
  const codecs = createPersistenceCodecs(dateObjectCodec);
  const contributors = new ContentContributors({
    documents,
    settings: { getSettings: async () => DEFAULT_APP_SETTINGS },
    codec: codecs.contentContributor,
  });
  return {
    module: new CatalogModule({
      documents,
      media,
      mediaCoordinator: new MediaCoordinator(media, ids),
      ids,
      clock: new FixedClock(new Date('2025-04-10T12:00:00.000Z')),
      contributors,
      codecs,
      imports: { reader: imports, codec: codecs.inaturalistCatalog },
    }),
    documents,
    media,
    imports,
    codecs,
  };
}

describe('CatalogModule', () => {
  it('lets an admin create, list, load, and remove a catalog entry', async () => {
    const { module } = buildModule();
    const created = await module.create(admin, {
      cat,
      credits: 'Campus Cats team',
      photos: ['file://profile.jpg'],
    });

    expect(created).toMatchObject({
      ok: true,
      value: { id: 'cat-1', cat: { name: 'Goldie' }, createdBy: { id: 'admin-1' } },
    });
    await expect(module.list()).resolves.toMatchObject({ ok: true, value: [{ id: 'cat-1' }] });
    await expect(module.get('cat-1')).resolves.toMatchObject({
      ok: true,
      value: { id: 'cat-1', source: 'campus-cats' },
    });
    await expect(module.remove(admin, 'cat-1')).resolves.toMatchObject({ ok: true });
  });

  it('shows separately stored catalog contributors only to officers by default', async () => {
    const { module, documents } = buildModule();
    await module.create(admin, {
      cat,
      credits: 'Campus Cats team',
      photos: ['file://profile.jpg'],
    });

    expect((await documents.get('catalog', 'cat-1'))?.data).not.toHaveProperty('createdBy');
    await expect(module.get(member, 'cat-1')).resolves.toMatchObject({
      ok: true,
      value: { createdBy: undefined },
    });
    await expect(module.get(admin, 'cat-1')).resolves.toMatchObject({
      ok: true,
      value: { createdBy: { id: 'admin-1' } },
    });
  });

  it('populates the catalog from guide profiles and applies local overrides', async () => {
    const { module, imports, codecs } = buildModule();
    const imported = codecs.inaturalistCatalog.decode('2113386', {
      guideId: 18800,
      sourceUrl: 'https://www.inaturalist.org/guide_taxa/2113386',
      sourceUpdatedAt: new Date('2025-05-20T01:14:20.435Z'),
      displayName: 'Mimi',
      shortDescription: 'Black-and-white male with chin-spot',
      metadata: {
        yearsRecorded: ['2023', '2024', '2025'],
        areasOfResidence: ['Central Campus', 'Tech Parkway'],
        currentStatus: 'Feral',
        furLength: 'Short',
        furPatterns: ['Black and White'],
        tnr: 'Yes',
        sex: 'Male',
      },
      photos: [
        {
          kind: 'external',
          id: 'inat-photo-1',
          url: 'https://example.com/large.jpg',
          thumbnailUrl: 'https://example.com/small.jpg',
          role: 'profile',
          sourceUrl: 'https://www.inaturalist.org/photos/1',
          attribution: 'Observer (CC BY-NC)',
          licenseCode: 'CC-BY-NC',
          licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
        },
      ],
      sourceActive: true,
      visible: true,
      importedAt: new Date('2026-08-04T07:17:00.000Z'),
      syncedAt: new Date('2026-08-04T07:17:00.000Z'),
      lastSeenRunId: 'run-1',
      moderation: { hidden: false, reason: '' },
      overrides: { behavior: 'Keeps a cautious distance.' },
      matchStatus: 'unlinked',
    });
    imports.catalog.set('2113386', codecs.inaturalistCatalog.encode(imported));

    await expect(module.list()).resolves.toMatchObject({
      ok: true,
      value: [
        {
          source: 'inaturalist',
          id: 'inat-guide-2113386',
          cat: {
            name: 'Mimi',
            behavior: 'Keeps a cautious distance.',
            yearsRecorded: '2023, 2024, 2025',
          },
        },
      ],
    });
    await expect(module.media('inat-guide-2113386')).resolves.toMatchObject({
      ok: true,
      value: [{ kind: 'external', role: 'profile' }],
    });
  });

  it('renders one composite profile when an imported cat links to a local entry', async () => {
    const { module, imports, codecs, media } = buildModule();
    await module.create(admin, {
      cat: { ...cat, name: 'Mimi' },
      credits: 'Campus Cats team',
      photos: ['file://profile.jpg'],
    });
    const imported = codecs.inaturalistCatalog.decode('2113386', {
      guideId: 18800,
      sourceUrl: 'https://www.inaturalist.org/guide_taxa/2113386',
      sourceUpdatedAt: new Date('2025-05-20T01:14:20.435Z'),
      displayName: 'Mimi',
      shortDescription: 'Source description',
      metadata: {
        yearsRecorded: [],
        areasOfResidence: [],
        furPatterns: [],
      },
      photos: [],
      sourceActive: true,
      visible: true,
      importedAt: new Date('2026-08-04T07:17:00.000Z'),
      syncedAt: new Date('2026-08-04T07:17:00.000Z'),
      lastSeenRunId: 'run-1',
      moderation: { hidden: false, reason: '' },
      overrides: {},
      linkedLocalCatalogId: 'cat-1',
      matchStatus: 'linked',
    });
    imports.catalog.set('2113386', codecs.inaturalistCatalog.encode(imported));

    const result = await module.list();
    expect(result).toMatchObject({
      ok: true,
      value: [
        {
          source: 'inaturalist',
          cat: { name: 'Mimi', descShort: cat.descShort },
          linkedLocalCatalogId: 'cat-1',
          localContribution: { credits: 'Campus Cats team' },
        },
      ],
    });
    await expect(module.media('inat-guide-2113386')).resolves.toMatchObject({
      ok: true,
      value: [{ id: media.ids()[0] }],
    });
  });

  it('rejects destructive mutations against imported guide profiles', async () => {
    const { module } = buildModule();
    await expect(
      module.update(admin, 'inat-guide-2113386', {
        cat,
        credits: '',
        profile: storedMedia('unused'),
        gallery: [],
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      module.remove(admin, 'inat-guide-2113386'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });

  it('rejects non-admin mutations', async () => {
    const { module } = buildModule();

    await expect(
      module.create(member, { cat, credits: '', photos: ['file://profile.jpg'] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });

  it('stores at most one favorite per account and aggregates heart counts', async () => {
    const { module, documents } = buildModule();

    await expect(module.setFavorite(member, 'cat-1')).resolves.toMatchObject({
      ok: true,
      value: { userId: 'member-1', catalogId: 'cat-1' },
    });
    await expect(
      module.setFavorite(member, 'inat-guide-2113386'),
    ).resolves.toMatchObject({
      ok: true,
      value: { userId: 'member-1', catalogId: 'inat-guide-2113386' },
    });

    expect(await documents.list('catalog-favorites')).toHaveLength(1);
    await expect(module.favoriteSummary(member)).resolves.toMatchObject({
      ok: true,
      value: {
        selectedCatalogId: 'inat-guide-2113386',
        counts: { 'inat-guide-2113386': 1 },
      },
    });

    await expect(module.setFavorite(member, undefined)).resolves.toMatchObject({
      ok: true,
      value: undefined,
    });
    await expect(module.favoriteSummary(member)).resolves.toMatchObject({
      ok: true,
      value: { counts: {} },
    });
  });

  it('requires an authenticated account for favorite operations', async () => {
    const { module } = buildModule();

    await expect(module.favoriteSummary(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.setFavorite(undefined, 'cat-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.setFavorite(member, '   ')).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
  });

  it('reports the first missing required field and requires a profile photo', async () => {
    const { module } = buildModule();

    await expect(
      module.create(admin, {
        cat: { ...cat, descShort: '' },
        credits: '',
        photos: ['file://profile.jpg'],
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message: 'Short Description field must not be empty' },
    });
    await expect(
      module.create(admin, { cat, credits: '', photos: [] }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message: 'Please select a photo.' },
    });
  });

  it('records the current editor while preserving the existing data shape', async () => {
    const { module, media } = buildModule();
    await module.create(admin, { cat, credits: '', photos: ['file://profile.jpg'] });
    const superAdmin = parseUser({
      id: 'super-1',
      email: 'super@gatech.edu',
      role: Role.VicePresident,
    });

    const updated = await module.update(superAdmin, 'cat-1', {
      cat: { ...cat, name: 'Goldie II' },
      credits: 'Updated source',
      profile: storedMedia(media.ids()[0]),
      gallery: [],
    });

    expect(updated).toMatchObject({
      ok: true,
      value: {
        cat: { name: 'Goldie II' },
        createdAt: new Date('2025-04-10T12:00:00.000Z'),
        createdBy: { id: 'super-1' },
      },
    });
  });

  it('returns not-found and dependency outcomes', async () => {
    const { module, documents, media } = buildModule();
    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    documents.failNext('get', new Error('offline'));
    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    documents.failNext('list', new Error('offline'));
    await expect(module.list()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    media.failNext('list', new Error('offline'));
    await expect(module.media('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('covers update authorization, validation, not-found, and media failures', async () => {
    const update = {
      cat,
      credits: '',
      profile: storedMedia('catalog/cat-1/profile-1.jpg'),
      gallery: [],
    };
    await expect(buildModule().module.update(undefined, 'missing', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(buildModule().module.update(member, 'missing', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(buildModule().module.update(admin, 'missing', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    const invalid = buildModule();
    await invalid.module.create(admin, { cat, credits: '', photos: ['file://profile.jpg'] });
    await expect(
      invalid.module.update(admin, 'cat-1', { ...update, cat: { ...cat, name: '' } }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });

    const failed = buildModule();
    await failed.module.create(admin, { cat, credits: '', photos: ['file://profile.jpg'] });
    failed.media.failNext('list', new Error('offline'));
    await expect(failed.module.update(admin, 'cat-1', update)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('reports create and delete dependency outcomes', async () => {
    const createFailure = buildModule();
    createFailure.media.failNext('list', new Error('offline'));
    await expect(
      createFailure.module.create(admin, { cat, credits: '', photos: ['file://profile.jpg'] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'dependency_failure' } });

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
    await documentFailure.module.create(admin, { cat, credits: '', photos: ['file://profile.jpg'] });
    documentFailure.documents.failNext('commit', new Error('offline'));
    await expect(documentFailure.module.remove(admin, 'cat-1')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    for (const operation of ['list', 'remove'] as const) {
      const cleanupFailure = buildModule();
      await cleanupFailure.module.create(admin, {
        cat,
        credits: '',
        photos: ['file://profile.jpg'],
      });
      cleanupFailure.media.failNext(operation, new Error('offline'));
      await expect(cleanupFailure.module.remove(admin, 'cat-1')).resolves.toMatchObject({
        ok: true,
        warnings: [{ code: 'cleanup_failed' }],
      });
    }
  });
});
