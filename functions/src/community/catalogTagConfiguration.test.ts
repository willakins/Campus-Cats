import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleSaveCatalogTags } from './catalogTagConfiguration';

const actor = {
  id: 'officer',
  email: 'officer@example.com',
  clubId: 'club',
  role: 1 as const,
  banned: false,
};
const data = {
  clubId: 'club',
  tags: [{ id: 'tag', label: 'Friendly 🐈' }],
  assignments: [],
};
describe('catalog tag configuration boundary', () => {
  it('supports 50 tags and atomically removes a tag from assignments', async () => {
    let saves = 0;
    await handleSaveCatalogTags(
      {
        authUid: actor.id,
        data: {
          ...data,
          tags: Array.from({ length: 50 }, (_, i) => ({
            id: `tag-${i}`,
            label: `Tag ${i}`,
          })),
          assignments: [{ catalogId: 'cat', tagIds: ['tag-1'] }],
        },
      },
      {
        getUser: async () => actor,
        save: async (club, tags, assignments) => {
          saves++;
          assert.equal(club, 'club');
          assert.equal(tags.length, 50);
          assert.deepEqual(assignments, [
            { catalogId: 'cat', tagIds: ['tag-1'] },
          ]);
        },
      },
    );
    assert.equal(saves, 1);
  });
  it('rejects invalid tags, duplicate labels, paths and unauthorized callers before saving', async () => {
    for (const request of [
      { data },
      { authUid: actor.id, data: { ...data, clubId: 'other' } },
      {
        authUid: actor.id,
        data: { ...data, tags: [{ id: 'tag', label: 'x'.repeat(41) }] },
      },
      {
        authUid: actor.id,
        data: { ...data, tags: [{ id: 'tag', label: 'bad\u0000text' }] },
      },
      {
        authUid: actor.id,
        data: {
          ...data,
          tags: [
            { id: 'a', label: 'Tag' },
            { id: 'b', label: 'tag' },
          ],
        },
      },
      {
        authUid: actor.id,
        data: {
          ...data,
          assignments: [{ catalogId: 'cat/nested/path', tagIds: [] }],
        },
      },
    ]) {
      let saved = false;
      await assert.rejects(
        handleSaveCatalogTags(request, {
          getUser: async () => actor,
          save: async () => {
            saved = true;
          },
        }),
      );
      assert.equal(saved, false);
    }
    await assert.rejects(
      handleSaveCatalogTags(
        { authUid: actor.id, data },
        {
          getUser: async () => ({ ...actor, banned: true }),
          save: async () => {
            throw Error('Should not save');
          },
        },
      ),
      { code: 'permission-denied' },
    );
  });
});
