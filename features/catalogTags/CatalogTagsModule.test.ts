import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parseUser,
} from '../../core/domain';
import { CatalogTagsModule } from './CatalogTagsModule';

const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});

const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});

function buildModule() {
  const documents = new InMemoryDocumentStore();
  return {
    module: new CatalogTagsModule({
      documents,
      ids: new SequenceIdGenerator(['custom-tag-1']),
      codecs: createPersistenceCodecs(dateObjectCodec),
    }),
    documents,
  };
}

describe('CatalogTagsModule', () => {
  it('shows the existing derived tags as the default configurable set', async () => {
    const { module } = buildModule();

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [
        { id: 'adopted', label: 'Adopted' },
        { id: 'feral', label: 'Feral' },
        { id: 'frat-cat', label: 'Frat Cat' },
        { id: 'deceased', label: 'Deceased' },
        { id: 'tnr-complete', label: 'TNR complete' },
        { id: 'needs-tnr', label: 'Needs TNR' },
        { id: 'female', label: 'Female' },
        { id: 'male', label: 'Male' },
        { id: 'short-hair', label: 'Short hair' },
        { id: 'medium-hair', label: 'Medium hair' },
        { id: 'long-hair', label: 'Long hair' },
      ],
    });
  });

  it('lets officers create, rename, and delete the configured tags', async () => {
    const { module } = buildModule();

    await expect(module.create(officer, 'Needs medication')).resolves.toMatchObject({
      ok: true,
      value: { id: 'custom-tag-1', label: 'Needs medication' },
    });
    await expect(
      module.update(officer, 'adopted', 'Adopted / rehomed'),
    ).resolves.toMatchObject({
      ok: true,
      value: { id: 'adopted', label: 'Adopted / rehomed' },
    });
    await expect(module.remove(officer, 'tnr-complete')).resolves.toMatchObject({
      ok: true,
    });

    const listed = await module.list(member);
    expect(listed).toMatchObject({ ok: true });
    if (!listed.ok) throw new Error('Expected catalog tags');
    expect(listed.value).toContainEqual({
      id: 'custom-tag-1',
      label: 'Needs medication',
    });
    expect(listed.value).toContainEqual({
      id: 'adopted',
      label: 'Adopted / rehomed',
    });
    expect(listed.value).not.toContainEqual(
      expect.objectContaining({ id: 'tnr-complete' }),
    );
  });

  it('stores explicit catalog assignments and cleans up deleted tags', async () => {
    const { module } = buildModule();

    await expect(
      module.assign(officer, 'catalog-1', ['adopted', 'female']),
    ).resolves.toMatchObject({
      ok: true,
      value: { catalogId: 'catalog-1', tagIds: ['adopted', 'female'] },
    });
    await expect(module.remove(officer, 'adopted')).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.assignments(member)).resolves.toMatchObject({
      ok: true,
      value: [{ catalogId: 'catalog-1', tagIds: ['female'] }],
    });

    await expect(module.assign(officer, 'catalog-1', [])).resolves.toMatchObject({
      ok: true,
      value: { catalogId: 'catalog-1', tagIds: [] },
    });
  });

  it('requires authentication to read tags and officer access to mutate them', async () => {
    const { module } = buildModule();

    await expect(module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.assignments(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(module.create(member, 'Medical')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      module.update(member, 'feral', 'Community cat'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.remove(member, 'feral')).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      module.assign(member, 'catalog-1', ['feral']),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });

  it('rejects duplicate names and assignments to unconfigured tags', async () => {
    const { module } = buildModule();

    await expect(module.create(officer, 'feral')).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    await expect(
      module.assign(officer, 'catalog-1', ['not-configured']),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
  });
});
