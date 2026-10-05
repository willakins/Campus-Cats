import { getApp } from 'firebase-admin/app';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { createFirebaseRelationalAuthorization } from '../relational/firebaseCallableAuthorization';
import { createCallableAccess } from './callableAccess';

let access: ReturnType<typeof createCallableAccess> | undefined;
function callableAccess() {
  return (access ??= createCallableAccess(
    createFirebaseRelationalAuthorization({
      firebaseProjectId:
        process.env.GCLOUD_PROJECT ?? getApp().options.projectId ?? '',
      termsVersion: '2026-08-28',
    }),
  ));
}

export const authorizedMemberRequest = <T>(request: CallableRequest<T>) =>
  callableAccess().memberRequest(request);

// Billing recovery and account deletion must remain available without an active
// club subscription or terms consent, but still require an unrevoked login.
export const verifiedAccountRequest = <T>(request: CallableRequest<T>) =>
  callableAccess().accountRequest(request);
