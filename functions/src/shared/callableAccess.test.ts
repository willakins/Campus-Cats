import assert from 'node:assert/strict';
import test from 'node:test';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createCallableAccess } from './callableAccess';
import { createFirebaseAuthorizer } from '../relational/firebaseAuthorization';

const request = { data: { title: 'A valid title' } } as CallableRequest<{
  title: string;
}>;
const member = {
  clubId: 'club',
  role: 1,
  agreedToTerms: true,
  termsVersion: 'current',
};

test('member requests fail closed for invalid membership, account, and club state', async () => {
  for (const state of [
    { member: undefined, club: {}, disabled: false },
    { member, club: undefined, disabled: false },
    { member: { ...member, agreedToTerms: false }, club: {}, disabled: false },
    { member: { ...member, termsVersion: 'old' }, club: {}, disabled: false },
    { member: { ...member, banned: true }, club: {}, disabled: false },
    { member, club: {}, disabled: true },
    { member, club: { maintenanceMode: true }, disabled: false },
    {
      member,
      club: { billingEnforcementEnabled: true, accessState: 'disabled' },
      disabled: false,
    },
    {
      member,
      club: {
        billingEnforcementEnabled: true,
        accessState: 'enabled',
        graceEndsAt: 'malformed',
      },
      disabled: false,
    },
    {
      member,
      club: {
        billingEnforcementEnabled: true,
        accessState: 'enabled',
        scheduledEndAt: new Date(0),
      },
      disabled: false,
    },
  ]) {
    const access = createCallableAccess({
      verifyRequest: async () => 'member',
      authorizeLive: createFirebaseAuthorizer({
        projectId: 'demo-campus-cats-test',
        termsVersion: 'current',
        now: () => new Date(),
        getMember: async () => state.member,
        getClub: async () => state.club,
        getAuthUser: async () => ({ disabled: state.disabled }),
      }),
    });
    await assert.rejects(
      access.memberRequest(request),
      (error: unknown) =>
        error instanceof HttpsError && error.code === 'permission-denied',
    );
  }
});

test('active members retain their verified identity and request data', async () => {
  const access = createCallableAccess({
    verifyRequest: async () => 'verified-member',
    authorizeLive: createFirebaseAuthorizer({
      projectId: 'demo-campus-cats-test',
      termsVersion: 'current',
      now: () => new Date(),
      getMember: async () => member,
      getClub: async () => ({}),
      getAuthUser: async () => ({ disabled: false }),
    }),
  });
  assert.deepEqual(await access.memberRequest(request), {
    authUid: 'verified-member',
    data: request.data,
  });
});

test('account recovery requires verification without requiring an active club', async () => {
  let verifications = 0;
  const access = createCallableAccess({
    verifyRequest: async () => {
      verifications++;
      return 'verified-member';
    },
    authorizeLive: async () => {
      throw new Error('Recovery must not require club access');
    },
  });
  assert.equal(
    (await access.accountRequest(request)).authUid,
    'verified-member',
  );
  assert.equal(verifications, 1);
});
