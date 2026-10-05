import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createFirebaseAuthorizer } from './firebaseAuthorization';

export function createFirebaseRelationalAuthorization(configuration: {
  firebaseProjectId: string;
  termsVersion: string;
}) {
  const auth = getAuth();
  const firestore = getFirestore();
  const authorizeLive = createFirebaseAuthorizer({
    projectId: configuration.firebaseProjectId,
    termsVersion: configuration.termsVersion,
    now: () => new Date(),
    getAuthUser: async (uid) => {
      try {
        return await auth.getUser(uid);
      } catch (error) {
        if ((error as { code?: string }).code === 'auth/user-not-found')
          return undefined;
        throw error;
      }
    },
    getMember: async (uid) =>
      (await firestore.collection('users').doc(uid).get()).data(),
    getClub: async (id) => {
      const data = (await firestore.collection('clubs').doc(id).get()).data();
      if (!data) return undefined;
      return {
        ...data,
        graceEndsAt:
          data.graceEndsAt instanceof Timestamp
            ? data.graceEndsAt.toDate()
            : data.graceEndsAt,
        scheduledEndAt:
          data.scheduledEndAt instanceof Timestamp
            ? data.scheduledEndAt.toDate()
            : data.scheduledEndAt,
      };
    },
  });
  return {
    authorizeLive,
    verifyRequest: async (
      request: CallableRequest<unknown>,
    ): Promise<string> => {
      if (!request.auth)
        throw new HttpsError('unauthenticated', 'Sign in to continue');
      const authorization = request.rawRequest.get('authorization');
      if (!authorization?.startsWith('Bearer '))
        throw new HttpsError('unauthenticated', 'Sign in to continue');
      try {
        // Explicit revocation check prevents an old cached token from bypassing disabled/deleted accounts.
        const verified = await auth.verifyIdToken(authorization.slice(7), true);
        if (
          verified.uid !== request.auth.uid ||
          verified.aud !== configuration.firebaseProjectId
        ) {
          throw new HttpsError('unauthenticated', 'Invalid authentication');
        }
      } catch {
        throw new HttpsError('unauthenticated', 'Sign in again to continue');
      }
      return request.auth!.uid;
    },
  };
}
