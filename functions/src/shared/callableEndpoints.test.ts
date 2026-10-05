import assert from 'node:assert/strict';
import test from 'node:test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createFirebaseRelationalAuthorization } from '../relational/firebaseCallableAuthorization';

const projectId = 'demo-campus-cats-test';
process.env.GCLOUD_PROJECT = projectId;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId,
  storageBucket: `${projectId}.appspot.com`,
});
if (!getApps().length)
  initializeApp({ projectId, storageBucket: `${projectId}.appspot.com` });
const request = {
  auth: { uid: 'member' },
  data: {},
  rawRequest: { get: () => 'Bearer test-token' },
} as unknown as CallableRequest<unknown>;

test('all protected callable entry points reject revoked sessions before doing work', async (context) => {
  const app = await import('../index');
  const core = await import('../community/coreCallables');
  const endpoints = [
    app.sendWhitelistEmail,
    app.getBillingSummary,
    app.getClubBillingSummary,
    app.createClubBillingSetupSession,
    app.createClubBillingPortalSession,
    app.payClubOutstandingInvoice,
    app.setClubCollectionMethod,
    app.updateClubBillingEmail,
    app.scheduleClubCancellation,
    app.resumeClubSubscription,
    app.migrateContributorPrivacy,
    app.updatePublicProfile,
    app.selectProfileTitle,
    app.createWhitelistUser,
    app.removeWhitelistUser,
    app.updateUserRole,
    app.addDisciplinaryNotice,
    app.setUserBanned,
    app.transferPresidency,
    app.removeManagedUser,
    app.deleteOwnAccount,
    app.sendAlert,
    app.createContest,
    app.saveCatalogTags,
    app.createSurvey,
    app.submitSurveyResponse,
    app.submitCommunityNomination,
    app.getCommunityVoteResults,
    app.moderateInaturalistRecord,
    app.updateInaturalistCatalog,
    app.linkInaturalistCatalog,
    app.runInaturalistSync,
    app.sendChatMessage,
    app.setChatReaction,
    app.markChatPingsRead,
    app.muteChatUser,
    app.setChatUserBanned,
    core.submitCommunityBallot,
    core.syncPublicProfile,
  ];
  const verify = context.mock.method(
    getAuth(),
    'verifyIdToken',
    async (_token: string, checkRevoked?: boolean) => {
      assert.equal(checkRevoked, true);
      throw new Error('auth/id-token-revoked');
    },
  );
  for (const endpoint of endpoints) {
    await assert.rejects(
      endpoint.run(request),
      (error: unknown) =>
        error instanceof HttpsError && error.code === 'unauthenticated',
    );
  }
  assert.equal(verify.mock.callCount(), endpoints.length);
});

test('token verification binds the request UID and configured project and rejects invalid sessions', async (context) => {
  const authorization = createFirebaseRelationalAuthorization({
    firebaseProjectId: projectId,
    termsVersion: 'current',
  });
  let token = { uid: 'member', aud: projectId } as DecodedIdToken;
  let failure: string | undefined;
  context.mock.method(
    getAuth(),
    'verifyIdToken',
    async (value: string, checkRevoked?: boolean) => {
      assert.equal(value, 'test-token');
      assert.equal(checkRevoked, true);
      if (failure) throw new Error(failure);
      return token;
    },
  );
  assert.equal(await authorization.verifyRequest(request), 'member');
  const rejects = (value = request) =>
    assert.rejects(
      authorization.verifyRequest(value),
      (error: unknown) =>
        error instanceof HttpsError && error.code === 'unauthenticated',
    );
  await rejects({ ...request, auth: undefined });
  await rejects({
    ...request,
    rawRequest: { get: () => undefined },
  } as unknown as CallableRequest<unknown>);
  for (const changed of [
    { uid: 'another-member', aud: projectId },
    { uid: 'member', aud: 'another-project' },
  ]) {
    token = changed as DecodedIdToken;
    await rejects();
  }
  for (failure of [
    'auth/user-disabled',
    'auth/user-not-found',
    'auth/id-token-expired',
    'auth/id-token-revoked',
  ]) {
    await rejects();
  }
});
