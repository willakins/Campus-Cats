import assert from 'node:assert/strict';
import { it } from 'node:test';
import { handleCreateContest } from './contestCreation';
const actor = {
  id: 'officer',
  email: 'officer@example.com',
  clubId: 'club',
  role: 1 as const,
  banned: false,
};
const data = {
  clubId: 'club',
  id: 'vote',
  title: 'Cats',
  details: '',
  durationMillis: 86400000,
  options: Array.from({ length: 20 }, (_, i) => ({
    id: `cat-${i}`,
    label: `Cat ${i}`,
    imageUrl: 'https://example.com/cat.jpg',
  })),
};
const now = new Date('2026-10-05T00:00:00Z');
it('creates the full supported contest with server-owned identity and dates', async () => {
  await handleCreateContest(
    { authUid: actor.id, data },
    {
      getUser: async () => actor,
      now: () => now,
      create: async (club, id, saved) => {
        assert.equal(club, 'club');
        assert.equal(id, 'vote');
        assert.equal((saved.options as unknown[]).length, 20);
        assert.equal(saved.createdAt, now);
        assert.equal(
          (saved.votingEndsAt as Date).toISOString(),
          '2026-10-06T00:00:00.000Z',
        );
        assert.deepEqual(saved.createdBy, {
          id: actor.id,
          email: actor.email,
          role: 1,
          clubId: 'club',
          platformAdmin: false,
        });
      },
    },
  );
});
it('rejects unauthorized, cross-club, unsafe-image and excessive-text requests', async () => {
  for (const request of [
    { data },
    { authUid: actor.id, data: { ...data, participationAudience: ['all_members'] } },
    { authUid: actor.id, data: { ...data, clubId: 'other' } },
    { authUid: actor.id, data: { ...data, durationMillis: 1 } },
    {
      authUid: actor.id,
      data: {
        ...data,
        options: [
          { ...data.options[0], imageUrl: 'javascript:alert(1)' },
          data.options[1],
        ],
      },
    },
    {
      authUid: actor.id,
      data: {
        ...data,
        options: [
          { ...data.options[0], label: 'x'.repeat(121) },
          data.options[1],
        ],
      },
    },
    {
      authUid: actor.id,
      data: { ...data, options: [data.options[0], data.options[0]] },
    },
  ]) {
    let saved = false;
    await assert.rejects(
      handleCreateContest(request, {
        getUser: async () => actor,
        now: () => now,
        create: async () => {
          saved = true;
        },
      }),
    );
    assert.equal(saved, false);
  }
});
