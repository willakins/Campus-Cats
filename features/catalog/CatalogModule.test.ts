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
import { CatalogModule } from './CatalogModule';

const admin = parseUser({ id: 'admin-1', email: 'admin@gatech.edu', role: Role.Admin });
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
  return {
    module: new CatalogModule({
      documents,
      media,
      mediaCoordinator: new MediaCoordinator(media, ids),
      ids,
      clock: new FixedClock(new Date('2025-04-10T12:00:00.000Z')),
      codecs: createFirestoreCodecs({ fromDate: (date) => date }),
    }),
    documents,
    media,
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
    await expect(module.get('cat-1')).resolves.toEqual(created);
    await expect(module.remove(admin, 'cat-1')).resolves.toMatchObject({ ok: true });
  });

  it('rejects non-admin mutations', async () => {
    const { module } = buildModule();

    await expect(
      module.create(member, { cat, credits: '', photos: ['file://profile.jpg'] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
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
      role: Role.SuperAdmin,
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
    const { module, documents } = buildModule();
    await expect(module.get('missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
    documents.failNext('list', new Error('offline'));
    await expect(module.list()).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
