import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import type { LiveMemberAccess } from '../relational/readGateway';

export interface CallableAccessDependencies {
  verifyRequest(request: CallableRequest<unknown>): Promise<string>;
  authorizeLive(uid: string): Promise<LiveMemberAccess | undefined>;
}

export function createCallableAccess(dependencies: CallableAccessDependencies) {
  async function accountRequest<T>(request: CallableRequest<T>) {
    const authUid = await dependencies.verifyRequest(request);
    return { authUid, data: request.data };
  }

  async function memberRequest<T>(request: CallableRequest<T>) {
    const verified = await accountRequest(request);
    const access = await dependencies.authorizeLive(verified.authUid);
    if (
      !access ||
      access.banned ||
      access.authDisabled ||
      !access.clubAccessEnabled
    ) {
      throw new HttpsError(
        'permission-denied',
        'Active club membership and current terms consent are required',
      );
    }
    return verified;
  }

  return { accountRequest, memberRequest };
}
