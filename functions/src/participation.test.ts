import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HandlerError, Role } from './handlers';
import {
  assertCanParticipate,
  parseParticipationAudience,
} from './participation';

describe('trusted participation policy', () => {
  it('defaults legacy records to all members', () => {
    assert.equal(parseParticipationAudience(undefined), 'all_members');
    assert.doesNotThrow(() => assertCanParticipate(undefined, 0, 'survey'));
  });

  it('rejects members from officer-only participation', () => {
    assert.throws(
      () => assertCanParticipate('officers_only', 0, 'vote'),
      (error: unknown) =>
        error instanceof HandlerError && error.code === 'permission-denied',
    );
  });

  it('allows every cascading officer role', () => {
    for (const role of [1, 2, 3, 4] satisfies readonly Role[]) {
      assert.doesNotThrow(() =>
        assertCanParticipate('officers_only', role, 'survey'),
      );
    }
  });

  it('rejects invalid stored audience values', () => {
    assert.throws(
      () => parseParticipationAudience('admins_only'),
      (error: unknown) =>
        error instanceof HandlerError && error.code === 'internal',
    );
  });
});
