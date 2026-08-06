import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  COLLECTIONS,
  DEFAULT_APP_SETTINGS,
  Role,
  createPersistenceCodecs,
  dateObjectCodec,
  parseUser,
} from '../../core/domain';
import { ContentContributors } from './ContentContributors';

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
const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});

const buildContributors = () => {
  const documents = new InMemoryDocumentStore();
  const codecs = createPersistenceCodecs(dateObjectCodec);
  let sightingsAnonymous = true;
  const contributors = new ContentContributors({
    documents,
    settings: {
      getSettings: async () => ({
        ...DEFAULT_APP_SETTINGS,
        sightingsAnonymous,
      }),
    },
    codec: codecs.contentContributor,
  });
  return {
    contributors,
    documents,
    setAnonymous(value: boolean) {
      sightingsAnonymous = value;
    },
  };
};

describe('ContentContributors', () => {
  it('returns no contributor collection to anonymous members', async () => {
    const { contributors } = buildContributors();

    await expect(
      contributors.visibleByContentId(member, 'sighting'),
    ).resolves.toEqual(new Map());
    await expect(
      contributors.visibleForContent(undefined, 'sighting', 'sighting-1'),
    ).resolves.toBeUndefined();
    await expect(
      contributors.contentIdsForUser(undefined, 'sighting', member.id),
    ).resolves.toEqual([]);
    await expect(
      contributors.contentIdsForUser(otherMember, 'sighting', member.id),
    ).resolves.toEqual([]);
  });

  it('shows matching contributors to officers and in public mode', async () => {
    const { contributors, documents, setAnonymous } = buildContributors();
    await documents.commit([
      contributors.write('sighting', 'sighting-1', member),
      contributors.write('catalog', 'catalog-1', otherMember),
    ]);

    await expect(
      contributors.visibleByContentId(officer, 'sighting'),
    ).resolves.toEqual(new Map([['sighting-1', member]]));

    setAnonymous(false);
    await expect(
      contributors.visibleByContentId(otherMember, 'catalog'),
    ).resolves.toEqual(new Map([['catalog-1', otherMember]]));
  });

  it('allows owners to resolve themselves while hiding them from other members', async () => {
    const { contributors, documents } = buildContributors();
    await documents.commit([
      contributors.write('sighting', 'sighting-1', member),
    ]);

    await expect(
      contributors.visibleForContent(member, 'sighting', 'sighting-1'),
    ).resolves.toEqual(member);
    await expect(
      contributors.visibleForContent(otherMember, 'sighting', 'sighting-1'),
    ).resolves.toBeUndefined();
    await expect(
      contributors.visibleForContent(officer, 'sighting', 'missing'),
    ).resolves.toBeUndefined();
  });

  it('rejects mismatched contributor records', async () => {
    const { contributors, documents } = buildContributors();
    await documents.put(COLLECTIONS.contentContributors, 'sighting__sighting-1', {
      kind: 'catalog',
      contentId: 'catalog-1',
      user: member,
    });

    await expect(
      contributors.visibleForContent(officer, 'sighting', 'sighting-1'),
    ).resolves.toBeUndefined();
  });

  it('suppresses denied reads but surfaces storage failures to authorized viewers', async () => {
    const { contributors, documents } = buildContributors();
    documents.failNext('get', new Error('denied'));
    await expect(
      contributors.visibleForContent(otherMember, 'sighting', 'sighting-1'),
    ).resolves.toBeUndefined();

    documents.failNext('get', new Error('offline'));
    await expect(
      contributors.visibleForContent(officer, 'sighting', 'sighting-1'),
    ).rejects.toThrow('offline');
  });

  it('lists only matching contribution kinds for the owner or an officer', async () => {
    const { contributors, documents } = buildContributors();
    await documents.commit([
      contributors.write('sighting', 'sighting-1', member),
      contributors.write('catalog', 'catalog-1', member),
    ]);

    await expect(
      contributors.contentIdsForUser(member, 'sighting', member.id),
    ).resolves.toEqual(['sighting-1']);
    await expect(
      contributors.contentIdsForUser(officer, 'catalog', member.id),
    ).resolves.toEqual(['catalog-1']);
  });

  it('builds atomic write and remove descriptors', () => {
    const { contributors } = buildContributors();

    expect(contributors.write('sighting', 'sighting-1', member)).toMatchObject({
      operation: 'put',
      collection: COLLECTIONS.contentContributors,
      id: 'sighting__sighting-1',
      data: { kind: 'sighting', contentId: 'sighting-1', user: member },
    });
    expect(contributors.remove('catalog', 'catalog-1')).toEqual({
      operation: 'remove',
      collection: COLLECTIONS.contentContributors,
      id: 'catalog__catalog-1',
    });
  });
});
