import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mayEditFieldValues,
  validateFieldDefinitions,
  validateFieldValues,
} from './customFields';
const text = {
  id: 'care_notes',
  label: 'Care notes',
  type: 'text',
  options: [],
  active: true,
} as const;
const number = {
  id: 'weight',
  label: 'Weight',
  type: 'number',
  options: [],
  active: true,
} as const;
const fields = () => validateFieldDefinitions([text, number], []);
test('validates typed optional values and rejects unknown, archived, oversized and nonfinite values', () => {
  assert.deepEqual(
    validateFieldValues({ care_notes: 'Friendly', weight: 4.5 }, fields()),
    { care_notes: 'Friendly', weight: 4.5 },
  );
  assert.deepEqual(validateFieldValues({ weight: null }, fields()), {
    weight: null,
  });
  for (const values of [
    { other: 'x' },
    { weight: '4' },
    { weight: Infinity },
    { care_notes: 'x'.repeat(1001) },
  ])
    assert.throws(() => validateFieldValues(values, fields()));
  assert.throws(() =>
    validateFieldValues({ care_notes: 'x' }, [
      { ...fields()[0], active: false },
    ]),
  );
});
test('archives fields without allowing removal, type changes or invalid choices', () => {
  const previous = fields();
  assert.equal(
    validateFieldDefinitions(
      previous.map((field) => ({ ...field, active: false })),
      previous,
    )[0].active,
    false,
  );
  assert.throws(() => validateFieldDefinitions([], previous));
  assert.throws(() =>
    validateFieldDefinitions([{ ...text, type: 'number' }, number], previous),
  );
  assert.throws(() =>
    validateFieldDefinitions([text, { ...text, id: 'another' }], []),
  );
  assert.throws(() =>
    validateFieldDefinitions(
      [{ ...text, type: 'choice', options: ['Only'] }],
      [],
    ),
  );
  assert.throws(() =>
    validateFieldDefinitions([{ ...text, id: '__proto__' }], []),
  );
});
test('sighting values are author-only; catalog and station values require officers', () => {
  assert.equal(mayEditFieldValues(0, 'sighting', 'owner', 'owner'), true);
  assert.equal(mayEditFieldValues(4, 'sighting', 'admin', 'owner'), false);
  assert.equal(mayEditFieldValues(0, 'catalog', 'member'), false);
  assert.equal(mayEditFieldValues(1, 'station', 'officer'), true);
});

test('the transaction handler rechecks live access, role, ownership, and retains archived values', async () => {
  const { handleSaveCustomFields } = await import('./customFields');
  const actor = {
    clubId: 'club',
    role: 3,
    banned: false,
    agreedToTerms: true,
    termsVersion: '2026-08-28',
  };
  let context = {
    actor,
    clubAccessible: true,
    fields: fields(),
    record: { exists: true, path: 'clubs/club/catalog/one', ownerId: 'owner' },
    previousValues: { archived: 'Retained' },
  };
  let saved: unknown;
  const dependencies = {
    transact: async (
      operation: Parameters<
        Parameters<typeof handleSaveCustomFields>[1]['transact']
      >[0],
    ) =>
      operation({
        load: async () => context,
        saveDefinitions: (_club, _kind, value) => {
          saved = value;
        },
        saveValues: (_club, _kind, _id, _path, value) => {
          saved = value;
        },
      }),
  };
  const request = {
    authUid: 'owner',
    authTime: 100,
    mode: 'values' as const,
    data: {
      clubId: 'club',
      kind: 'catalog',
      recordId: 'one',
      values: { weight: 4 },
    },
  };
  await handleSaveCustomFields(request, dependencies);
  assert.deepEqual(saved, { archived: 'Retained', weight: 4 });
  for (const patch of [
    { clubId: 'other' },
    { banned: true },
    { role: 0 },
    { deletionPending: true },
    { sessionRevokedAt: 100 },
    { agreedToTerms: false },
  ]) {
    context = { ...context, actor: { ...actor, ...patch } };
    await assert.rejects(handleSaveCustomFields(request, dependencies), {
      code: 'permission-denied',
    });
  }
  context = { ...context, actor: { ...actor, role: 0 } };
  await handleSaveCustomFields(
    { ...request, data: { ...request.data, kind: 'sighting' } },
    dependencies,
  );
  await assert.rejects(
    handleSaveCustomFields(
      {
        ...request,
        authUid: 'someone-else',
        data: { ...request.data, kind: 'sighting' },
      },
      dependencies,
    ),
    { code: 'permission-denied' },
  );
  await assert.rejects(
    handleSaveCustomFields(
      {
        ...request,
        mode: 'definitions',
        data: { clubId: 'club', kind: 'catalog', fields: fields() },
      },
      dependencies,
    ),
    { code: 'permission-denied' },
  );
});
