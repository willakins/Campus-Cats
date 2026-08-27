import {randomUUID} from 'node:crypto';

import {getApps, initializeApp} from 'firebase-admin/app';
import {Timestamp, getFirestore} from 'firebase-admin/firestore';
import {logger} from 'firebase-functions/logger';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';
import {onSchedule} from 'firebase-functions/v2/scheduler';

import {FirebaseInaturalistRepository} from './firebaseInaturalist';
import {HandlerError, ManagedUser} from './handlers';
import {
  InaturalistHttpGateway,
  runInaturalistSync as executeInaturalistSync,
} from './inaturalist';
import {handleRunInaturalistSync} from './inaturalistHandlers';

if (getApps().length === 0) initializeApp();

const firestore = getFirestore();
const gateway = new InaturalistHttpGateway();

export const synchronizeInaturalist = (clubId: string) =>
  executeInaturalistSync({
    gateway,
    repository: new FirebaseInaturalistRepository(firestore, clubId),
    clock: {now: () => new Date()},
    runId: randomUUID,
  });

const getUser = async (id: string): Promise<ManagedUser | undefined> => {
  const snapshot = await firestore.collection('users').doc(id).get();
  if (!snapshot.exists) return undefined;
  const data = snapshot.data();
  if (
    typeof data?.email !== 'string' ||
    (data.role !== 0 &&
      data.role !== 1 &&
      data.role !== 2 &&
      data.role !== 3 &&
      data.role !== 4)
  ) {
    throw new HandlerError('internal', 'Stored user profile is invalid');
  }
  const clubId = typeof data.clubId === 'string' ? data.clubId : 'campus-cats';
  const club = await firestore.collection('clubs').doc(clubId).get();
  const clubData = club.data();
  const now = new Date();
  const graceEndsAt =
    clubData?.graceEndsAt instanceof Timestamp
      ? clubData.graceEndsAt.toDate()
      : undefined;
  const scheduledEndAt =
    clubData?.scheduledEndAt instanceof Timestamp
      ? clubData.scheduledEndAt.toDate()
      : undefined;
  const hasAccess =
    clubData?.maintenanceMode !== true &&
    (clubData?.billingEnforcementEnabled !== true ||
      (clubData?.accessState === 'enabled' &&
        (!graceEndsAt || now < graceEndsAt) &&
        (!scheduledEndAt || now < scheduledEndAt)));
  if (!hasAccess) return undefined;
  return {
    id: snapshot.id,
    email: data.email,
    role: data.role,
    clubId,
    platformAdmin: data.platformAdmin === true,
    banned: data.banned === true,
  };
};

async function execute<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HandlerError) {
      throw new HttpsError(error.code, error.message);
    }
    logger.error('Callable workflow failed', error);
    throw new HttpsError(
      'internal',
      'The requested operation could not be completed',
    );
  }
}

const requestFor = <T>(request: CallableRequest<T>) => ({
  authUid: request.auth?.uid,
  data: request.data,
});

export const runInaturalistSync = onCall((request) =>
  execute(() =>
    handleRunInaturalistSync(requestFor(request), {
      getUser,
      runSync: synchronizeInaturalist,
    }),
  ),
);

export const syncInaturalistDaily = onSchedule(
  {
    schedule: '17 3 * * *',
    timeZone: 'America/New_York',
    retryCount: 3,
    maxInstances: 1,
    timeoutSeconds: 540,
  },
  async () => {
    const clubs = await firestore.collection('clubs').get();
    const failures: string[] = [];
    for (const club of clubs.docs) {
      const summary = await synchronizeInaturalist(club.id);
      logger.info('iNaturalist synchronization completed', {
        clubId: club.id,
        ...summary,
      });
      if (summary.status === 'partial' || summary.status === 'failed') {
        failures.push(`${club.id}:${summary.status}`);
      }
    }
    if (failures.length) {
      throw new Error(
        `iNaturalist synchronization failures: ${failures.join(', ')}`,
      );
    }
  },
);
