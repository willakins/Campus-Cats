import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { handleCreateSurvey } from './surveyCreation';

const actor = {
  id: 'officer',
  email: 'officer@example.com',
  clubId: 'club',
  role: 1 as const,
  banned: false,
};
const input = {
  clubId: 'club',
  id: 'survey',
  title: 'Survey',
  details: 'Details',
  anonymous: true,
  questions: [
    { id: 'question', type: 'short_text', prompt: 'Why?', options: [] },
  ],
};
const now = new Date('2026-10-05T00:00:00Z');
const dependencies = {
  getUser: async () => actor,
  now: () => now,
  create: async (
    _club: string,
    _id: string,
    _data: Record<string, unknown>,
  ) => {},
};

describe('survey creation boundary', () => {
  it('rejects arrays masquerading as enum text', async () => {
    for (const patch of [
      { participationAudience: ['all_members'] },
      { questions: [{ ...input.questions[0], type: ['short_text'] }] },
    ]) {
      let saved = false;
      await assert.rejects(handleCreateSurvey({ authUid: actor.id, data: { ...input, ...patch } }, {
        ...dependencies, create: async () => { saved = true; },
      }), { code: 'invalid-argument' });
      assert.equal(saved, false);
    }
  });
  it('accepts the full supported question/option count and stamps trusted authorship', async () => {
    let saved: Record<string, unknown> = {};
    await handleCreateSurvey(
      {
        authUid: actor.id,
        data: {
          ...input,
          createdBy: { id: 'victim' },
          createdAt: 'forged',
          questions: Array.from({ length: 40 }, (_, i) => ({
            id: `q-${i}`,
            type: 'multi_select',
            prompt: 'Choose',
            options: Array.from({ length: 20 }, (_, j) => ({
              id: `o-${j}`,
              label: 'O’Malley <3 🐈',
            })),
          })),
        },
      },
      {
        ...dependencies,
        create: async (club, id, data) => {
          assert.equal(club, 'club');
          assert.equal(id, 'survey');
          saved = data;
        },
      },
    );
    assert.deepEqual(saved.createdBy, {
      id: actor.id,
      email: actor.email,
      role: actor.role,
      clubId: actor.clubId,
      platformAdmin: false,
    });
    assert.equal(saved.createdAt, now);
    assert.equal((saved.questions as unknown[]).length, 40);
  });

  it('rejects callers without officer membership and cross-club requests', async () => {
    for (const request of [
      { data: input },
      { authUid: actor.id, data: { ...input, clubId: 'other' } },
    ]) {
      await assert.rejects(handleCreateSurvey(request, dependencies));
    }
    await assert.rejects(
      handleCreateSurvey(
        { authUid: actor.id, data: input },
        { ...dependencies, getUser: async () => ({ ...actor, banned: true }) },
      ),
    );
  });

  it('rejects malformed, excessive, duplicate, and hidden-control nested text before writing', async () => {
    for (const questions of [
      [{ id: 'q', type: 'short_text', prompt: 'x'.repeat(501), options: [] }],
      [{ id: 'q', type: 'short_text', prompt: 'bad\u0000text', options: [] }],
      [
        {
          id: 'q',
          type: 'single_choice',
          prompt: 'Choose',
          options: [
            { id: 'o', label: 'x'.repeat(301) },
            { id: 'b', label: 'OK' },
          ],
        },
      ],
      [input.questions[0], input.questions[0]],
      Array.from({ length: 41 }, (_, i) => ({
        ...input.questions[0],
        id: `q${i}`,
      })),
    ]) {
      let saved = false;
      await assert.rejects(
        handleCreateSurvey(
          { authUid: actor.id, data: { ...input, questions } },
          {
            ...dependencies,
            create: async () => {
              saved = true;
            },
          },
        ),
        { code: 'invalid-argument' },
      );
      assert.equal(saved, false);
    }
  });
});
