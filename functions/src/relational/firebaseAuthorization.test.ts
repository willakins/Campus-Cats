import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFirebaseAuthorizer } from './firebaseAuthorization';

const member = {
  clubId: 'club',
  role: 0,
  agreedToTerms: true,
  termsVersion: 'test-terms',
};
const now = new Date('2026-10-01T00:00:00Z');
const authorize = (
  user: Record<string, unknown> | undefined,
  club: Record<string, unknown> | undefined,
) =>
  createFirebaseAuthorizer({
    projectId: 'demo-test',
    termsVersion: 'test-terms',
    now: () => now,
    getAuthUser: async () => ({ disabled: false }),
    getMember: async () => user,
    getClub: async () => club,
  });
test('missing member, club or current terms fail closed', async () => {
  for (const [user, club] of [
    [undefined, {}],
    [member, undefined],
    [{ ...member, agreedToTerms: false }, {}],
    [{ ...member, termsVersion: 'old' }, {}],
  ] as const)
    assert.equal(await authorize(user, club)('uid'), undefined);
});
test('maintenance, disabled entitlement, expired and malformed deadlines deny', async () => {
  for (const club of [
    { maintenanceMode: true },
    { billingEnforcementEnabled: true, accessState: 'disabled' },
    {
      billingEnforcementEnabled: true,
      accessState: 'enabled',
      graceEndsAt: now,
    },
    {
      billingEnforcementEnabled: true,
      accessState: 'enabled',
      scheduledEndAt: 'invalid',
    },
  ]) {
    assert.equal(
      (await authorize(member, club)('uid'))?.clubAccessEnabled,
      false,
    );
  }
  assert.equal(
    (
      await authorize(member, {
        billingEnforcementEnabled: true,
        accessState: 'enabled',
        scheduledEndAt: new Date(now.getTime() + 1000),
      })('uid')
    )?.clubAccessEnabled,
    true,
  );
});
