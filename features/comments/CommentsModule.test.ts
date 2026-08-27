import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import {
  FixedClock,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parsePublicProfile,
  parseUser,
} from '../../core/domain';
import { CommentsModule } from './CommentsModule';

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

const target = { kind: 'sighting' as const, id: 'sighting-1' };

const buildModule = () => {
  const documents = new InMemoryDocumentStore();
  const codecs = createPersistenceCodecs(dateObjectCodec);
  return {
    comments: new CommentsModule({
      documents,
      ids: new SequenceIdGenerator(['comment-1']),
      clock: new FixedClock(new Date('2026-08-20T15:30:00.000Z')),
      codecs: {
        comment: codecs.comment,
        publicProfile: codecs.publicProfile,
      },
    }),
    documents,
    codecs,
  };
};

const seedTarget = (documents: InMemoryDocumentStore) =>
  documents.put('cat-sightings', target.id, { name: 'Goldie' });

describe('CommentsModule', () => {
  it('lets a member post and read a profile-backed comment on content', async () => {
    const { comments, documents, codecs } = buildModule();
    await seedTarget(documents);
    const profile = parsePublicProfile({
      id: member.id,
      displayName: 'Cat Watcher',
      bio: '',
      profilePhotoUrl: 'https://example.com/member.jpg',
      role: Role.Member,
      achievementIds: [],
      selectedTitleId: '',
    });
    await documents.put(
      'public-profiles',
      profile.id,
      codecs.publicProfile.encode(profile),
    );

    await expect(
      comments.create(member, target, '  I saw this cat yesterday!  '),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: 'comment-1',
        target,
        body: 'I saw this cat yesterday!',
        createdById: member.id,
        author: { displayName: 'Cat Watcher' },
      },
    });
    await expect(comments.list(member, target)).resolves.toMatchObject({
      ok: true,
      value: [
        {
          id: 'comment-1',
          body: 'I saw this cat yesterday!',
          author: { displayName: 'Cat Watcher' },
        },
      ],
    });
    const persisted = await documents.get('sighting-comments', 'comment-1');
    expect(persisted?.data).toMatchObject({
      createdById: member.id,
      target: { ...target, documentId: target.id },
    });
    expect(persisted?.data).not.toHaveProperty('createdBy');
  });

  it('reserves comment deletion for officers', async () => {
    const { comments, documents } = buildModule();
    await seedTarget(documents);
    await comments.create(member, target, 'Please refill the water bowl.');

    await expect(
      comments.remove(member, target, 'comment-1'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(
      comments.remove(officer, target, 'comment-1'),
    ).resolves.toMatchObject({
      ok: true,
    });
    await expect(comments.list(member, target)).resolves.toMatchObject({
      ok: true,
      value: [],
    });
  });

  it('does not create an orphan comment', async () => {
    const { comments } = buildModule();

    await expect(
      comments.create(member, target, 'Is this still here?'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
  });

  it('rejects Campus Cats comments longer than 300 characters', async () => {
    const { comments, documents } = buildModule();
    await seedTarget(documents);

    await expect(
      comments.create(member, target, 'x'.repeat(301)),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'validation',
        message: 'A comment must be between 1 and 300 characters',
      },
    });
  });

  it('maps imported catalog IDs to their persisted target documents', async () => {
    const { comments, documents } = buildModule();
    await documents.put('inaturalist-guide-profiles', '321', {
      visible: true,
    });
    const importedTarget = {
      kind: 'catalog' as const,
      id: 'inat-guide-321',
    };

    await expect(
      comments.create(member, importedTarget, 'This profile is very helpful.'),
    ).resolves.toMatchObject({
      ok: true,
      value: { target: importedTarget },
    });
    await expect(
      documents.get('catalog-comments', 'comment-1'),
    ).resolves.toMatchObject({
      data: {
        target: { ...importedTarget, documentId: '321' },
      },
    });
  });

  it('shows source-attributed iNaturalist comments and persists officer hides', async () => {
    const { comments, documents } = buildModule();
    const importedTarget = {
      kind: 'sighting' as const,
      id: 'inat-observation-321',
    };
    await documents.put('sighting-comments', 'inat-comment-source-uuid', {
      schemaVersion: 1,
      source: 'inaturalist',
      target: { ...importedTarget, documentId: '321' },
      targetKey: 'sighting:inat-observation-321',
      body: 'x'.repeat(301),
      createdAt: new Date('2026-08-11T02:53:45.000Z'),
      sourceUpdatedAt: new Date('2026-08-11T02:53:45.000Z'),
      sourceCommentId: 22894482,
      sourceCommentUuid: 'e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
      sourceUrl:
        'https://www.inaturalist.org/observations/321#comment-22894482',
      externalAuthor: {
        id: 8358607,
        login: 'chipmunkt',
        displayName: 'Chip Munk',
        sourceUrl: 'https://www.inaturalist.org/people/chipmunkt',
      },
      lastSeenRunId: 'run-1',
    });

    await expect(comments.list(member, importedTarget)).resolves.toMatchObject({
      ok: true,
      value: [
        {
          id: 'inat-comment-source-uuid',
          source: 'inaturalist',
          body: 'x'.repeat(301),
          externalAuthor: { login: 'chipmunkt', displayName: 'Chip Munk' },
        },
      ],
    });

    await expect(
      comments.remove(officer, importedTarget, 'inat-comment-source-uuid'),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      documents.get(
        'inaturalist-comment-moderation',
        'inat-comment-source-uuid',
      ),
    ).resolves.toMatchObject({
      data: {
        targetKey: 'sighting:inat-observation-321',
        hiddenById: officer.id,
      },
    });
    await expect(comments.list(member, importedTarget)).resolves.toMatchObject({
      ok: true,
      value: [],
    });
  });
});
