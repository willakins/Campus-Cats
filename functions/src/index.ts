import { createHash, randomUUID } from 'node:crypto';

import sgMail from '@sendgrid/mail';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import {
  HandlerDependencies,
  HandlerError,
  ManagedUser,
  PublicProfile,
  WhitelistApplication,
  handleAddDisciplinaryNotice,
  handleCreateWhitelistUser,
  handleGetBillingSummary,
  handleMigrateContributorPrivacy,
  handleSelectProfileTitle,
  handleRemoveManagedUser,
  handleSendAnnouncement,
  handleSendWhitelistEmail,
  handleSubmitWhitelistApplication,
  handleSetUserBanned,
  handleSyncPublicProfile,
  handleTransferPresidency,
  handleUpdateUserRole,
  handleUpdatePublicProfile,
} from './handlers';
import { createGoogleCloudBillingReader } from './billing';
import { FirebaseInaturalistRepository } from './firebaseInaturalist';
import {
  InaturalistHttpGateway,
  runInaturalistSync as executeInaturalistSync,
} from './inaturalist';
import {
  InaturalistHandlerDependencies,
  handleLinkInaturalistCatalog,
  handleModerateInaturalistRecord,
  handleRunInaturalistSync,
  handleUpdateInaturalistCatalog,
} from './inaturalistHandlers';

if (getApps().length === 0) initializeApp();

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const firestore = getFirestore();
const auth = getAuth();
const storage = getStorage();
const billingReader = createGoogleCloudBillingReader();
const inaturalistRepository = new FirebaseInaturalistRepository(firestore);
const inaturalistGateway = new InaturalistHttpGateway();

const publicProfileDefaults = (email: string, role: number) => ({
  displayName: (email.split('@')[0]?.trim() || 'Campus Cats member').slice(
    0,
    60,
  ),
  bio: '',
  profilePhotoUrl: '',
  role,
  achievementIds: [],
  selectedTitleId: '',
});

const validProfileAchievementIds: readonly PublicProfile['achievementIds'][number][] = [
  'profile-photo',
  'president',
  'first-sighting',
  'ten-sightings',
  'hundred-sightings',
];

const mergeProfileAchievements = (
  ...groups: readonly (readonly PublicProfile['achievementIds'][number][])[]
) =>
  validProfileAchievementIds.filter((id) =>
    groups.some((group) => group.includes(id)),
  );

function publicProfileFromData(
  id: string,
  data: Record<string, unknown> | undefined,
): PublicProfile {
  if (
    typeof data?.displayName !== 'string' ||
    typeof data.bio !== 'string' ||
    typeof data.profilePhotoUrl !== 'string' ||
    (data.role !== 0 &&
      data.role !== 1 &&
      data.role !== 2 &&
      data.role !== 3 &&
      data.role !== 4)
  ) {
    throw new HandlerError('internal', 'Stored public profile is invalid');
  }
  const storedAchievementIds: readonly unknown[] = Array.isArray(
    data.achievementIds,
  )
    ? data.achievementIds
    : [];
  const achievementIds = storedAchievementIds.length
    ? validProfileAchievementIds.filter((achievementId) =>
        storedAchievementIds.includes(achievementId),
      )
    : [];
  const selectedTitleId =
    typeof data.selectedTitleId === 'string' &&
    achievementIds.includes(
      data.selectedTitleId as (typeof achievementIds)[number],
    )
      ? (data.selectedTitleId as (typeof achievementIds)[number])
      : '';
  return {
    id,
    displayName: data.displayName,
    bio: data.bio,
    profilePhotoUrl: data.profilePhotoUrl,
    role: data.role,
    achievementIds,
    selectedTitleId,
  };
}

const dependencies: HandlerDependencies = {
  async getUser(id): Promise<ManagedUser | undefined> {
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
    return {
      id: snapshot.id,
      email: data.email,
      role: data.role,
      banned: data.banned === true,
    };
  },

  getBillingSummary: () => billingReader.getSummary(),

  async migrateContributorPrivacy() {
    const migrateCollection = async (
      collectionName: 'cat-sightings' | 'catalog',
      kind: 'sighting' | 'catalog',
    ): Promise<number> => {
      const snapshot = await firestore.collection(collectionName).get();
      const legacy = snapshot.docs.flatMap((document) => {
        const contributor = document.data().createdBy;
        if (
          typeof contributor !== 'object' ||
          contributor === null ||
          typeof contributor.id !== 'string' ||
          typeof contributor.email !== 'string' ||
          (contributor.role !== 0 &&
            contributor.role !== 1 &&
            contributor.role !== 2 &&
            contributor.role !== 3 &&
            contributor.role !== 4)
        ) {
          return [];
        }
        return [{ document, contributor }];
      });

      for (let offset = 0; offset < legacy.length; offset += 200) {
        const batch = firestore.batch();
        for (const { document, contributor } of legacy.slice(offset, offset + 200)) {
          batch.set(
            firestore.collection('content-contributors').doc(`${kind}__${document.id}`),
            { kind, contentId: document.id, user: contributor },
          );
          batch.update(document.ref, { createdBy: FieldValue.delete() });
        }
        await batch.commit();
      }
      return legacy.length;
    };

    const [sightings, catalog] = await Promise.all([
      migrateCollection('cat-sightings', 'sighting'),
      migrateCollection('catalog', 'catalog'),
    ]);
    return { sightings, catalog };
  },

  async listPushTokens() {
    const snapshot = await firestore.collection('users').get();
    return snapshot.docs
      .map((document) => document.data())
      .filter((profile) => profile.banned !== true)
      .map((profile) => profile.expoPushToken)
      .filter((token): token is string => typeof token === 'string' && !!token);
  },

  async sendPushBatch(messages) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      throw new Error(`Expo push provider returned ${response.status}`);
    }
  },

  async createAuthUser(email, password) {
    return (await auth.createUser({ email, password })).uid;
  },

  async deleteAuthUser(id) {
    await auth.deleteUser(id);
  },

  async putUser(user) {
    const batch = firestore.batch();
    batch.set(firestore.collection('users').doc(user.id), {
      email: user.email,
      role: user.role,
      banned: false,
      disciplinaryNotices: [],
    });
    batch.set(
      firestore.collection('public-profiles').doc(user.id),
      publicProfileDefaults(user.email, user.role),
    );
    await batch.commit();
  },

  async deleteUser(id) {
    const batch = firestore.batch();
    batch.delete(firestore.collection('users').doc(id));
    batch.delete(firestore.collection('public-profiles').doc(id));
    batch.delete(firestore.collection('catalog-favorites').doc(id));
    await batch.commit();
  },

  async updateUserRole(id, role) {
    const reference = firestore.collection('users').doc(id);
    const publicReference = firestore.collection('public-profiles').doc(id);
    await firestore.runTransaction(async (transaction) => {
      const [snapshot, publicSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(publicReference),
      ]);
      if (!snapshot.exists) {
        throw new HandlerError('not-found', 'User not found');
      }
      if (snapshot.data()?.banned === true) {
        throw new HandlerError(
          'permission-denied',
          'Unban this account before changing its role',
        );
      }
      transaction.update(reference, { role });
      if (publicSnapshot.exists) {
        transaction.update(publicReference, { role });
      } else {
        transaction.set(
          publicReference,
          publicProfileDefaults(String(snapshot.data()?.email ?? ''), role),
        );
      }
    });
  },

  async addDisciplinaryNotice(id, message, actor) {
    const reference = firestore.collection('users').doc(id);
    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) {
        throw new HandlerError('not-found', 'User not found');
      }
      if (snapshot.data()?.role !== 0) {
        throw new HandlerError(
          'permission-denied',
          'Only member accounts can receive disciplinary notices',
        );
      }
      transaction.update(reference, {
        disciplinaryNotices: FieldValue.arrayUnion({
          id: randomUUID(),
          message,
          createdAt: Timestamp.now(),
          issuedById: actor.id,
          issuedByEmail: actor.email,
        }),
      });
    });
  },

  async setUserBanned(id, banned, actor) {
    const reference = firestore.collection('users').doc(id);
    if (banned) {
      await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new HandlerError('not-found', 'User not found');
        }
        if (snapshot.data()?.role !== 0) {
          throw new HandlerError(
            'permission-denied',
            'Only member accounts can be banned',
          );
        }
        transaction.update(reference, {
          banned: true,
          bannedAt: Timestamp.now(),
          bannedById: actor.id,
          bannedByEmail: actor.email,
        });
      });
      await auth.updateUser(id, { disabled: true });
      await auth.revokeRefreshTokens(id);
      return;
    }

    const snapshot = await reference.get();
    if (!snapshot.exists) {
      throw new HandlerError('not-found', 'User not found');
    }
    if (snapshot.data()?.role !== 0) {
      throw new HandlerError(
        'permission-denied',
        'Only member accounts can be unbanned',
      );
    }
    await auth.updateUser(id, { disabled: false });
    await reference.update({
      banned: false,
      bannedAt: FieldValue.delete(),
      bannedById: FieldValue.delete(),
      bannedByEmail: FieldValue.delete(),
    });
  },

  async transferPresidency(actorId, successorId) {
    const actorReference = firestore.collection('users').doc(actorId);
    const successorReference = firestore.collection('users').doc(successorId);
    const presidencyReference = firestore.collection('system').doc('presidency');
    const actorPublicReference = firestore.collection('public-profiles').doc(actorId);
    const successorPublicReference = firestore
      .collection('public-profiles')
      .doc(successorId);
    const presidents = firestore.collection('users').where('role', '==', 3);

    await firestore.runTransaction(async (transaction) => {
      const [
        actorSnapshot,
        successorSnapshot,
        ,
        presidentSnapshots,
        actorPublicSnapshot,
        successorPublicSnapshot,
      ] =
        await Promise.all([
          transaction.get(actorReference),
          transaction.get(successorReference),
          transaction.get(presidencyReference),
          transaction.get(presidents),
          transaction.get(actorPublicReference),
          transaction.get(successorPublicReference),
        ]);
      const actor = actorSnapshot.data();
      const successor = successorSnapshot.data();
      if (!actorSnapshot.exists || !successorSnapshot.exists) {
        throw new HandlerError('not-found', 'Presidential participant not found');
      }
      if (successor?.role !== 2) {
        throw new HandlerError(
          'invalid-argument',
          'The presidential successor must still be a Vice-President',
        );
      }

      if (actor?.role === 3) {
        if (
          presidentSnapshots.size !== 1 ||
          presidentSnapshots.docs[0]?.id !== actorId
        ) {
          throw new HandlerError(
            'permission-denied',
            'The current President no longer controls the presidency',
          );
        }
        transaction.update(actorReference, { role: 1 });
        if (actorPublicSnapshot.exists) {
          transaction.update(actorPublicReference, {
            role: 1,
            achievementIds: FieldValue.arrayUnion('president'),
          });
        } else {
          transaction.set(actorPublicReference, {
            ...publicProfileDefaults(String(actor?.email ?? ''), 1),
            achievementIds: ['president'],
          });
        }
      } else if (actor?.role === 4) {
        if (!presidentSnapshots.empty) {
          throw new HandlerError(
            'already-exists',
            'A President already exists; only that President can transfer the role',
          );
        }
      } else {
        throw new HandlerError(
          'permission-denied',
          'Only the current President may transfer the presidency',
        );
      }

      transaction.update(successorReference, { role: 3 });
      if (successorPublicSnapshot.exists) {
        transaction.update(successorPublicReference, {
          role: 3,
          achievementIds: FieldValue.arrayUnion('president'),
        });
      } else {
        transaction.set(successorPublicReference, {
          ...publicProfileDefaults(String(successor?.email ?? ''), 3),
          achievementIds: ['president'],
        });
      }
      transaction.set(presidencyReference, { presidentId: successorId });
    });
  },

  async sendWhitelistCredentials(email, password) {
    sgMail.setApiKey(SENDGRID_API_KEY.value());
    await sgMail.send({
      to: email,
      from: 'gtcampuscats@gmail.com',
      subject: 'Campus Cats – Whitelist Approved!',
      text: `Your Campus Cats account is ready. Your temporary password is: ${password}`,
      html: `<p>Your Campus Cats account is ready.</p><p>Your temporary password is: <strong>${password}</strong></p>`,
    });
  },

  async findWhitelistByEmail(email) {
    const snapshot = await firestore
      .collection('whitelist')
      .where('email', '==', email)
      .limit(1)
      .get();
    return !snapshot.empty;
  },

  async createWhitelistApplication(application: WhitelistApplication) {
    const id = createHash('sha256')
      .update(application.email.toLowerCase())
      .digest('hex');
    try {
      await firestore.collection('whitelist').doc(id).create(application);
      return { created: true, id };
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : '';
      if (code === '6' || code.toLowerCase().includes('already-exists')) {
        return { created: false, id };
      }
      throw error;
    }
  },

  async getPublicProfile(id): Promise<PublicProfile | undefined> {
    const snapshot = await firestore.collection('public-profiles').doc(id).get();
    if (!snapshot.exists) return undefined;
    return publicProfileFromData(id, snapshot.data());
  },

  async putPublicProfile(profile, mode) {
    const reference = firestore.collection('public-profiles').doc(profile.id);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists
        ? publicProfileFromData(snapshot.id, snapshot.data())
        : undefined;
      const achievementIds = mergeProfileAchievements(
        current?.achievementIds ?? [],
        profile.achievementIds,
      );
      const requestedTitleId =
        mode === 'title'
          ? profile.selectedTitleId
          : current?.selectedTitleId ?? profile.selectedTitleId;
      if (requestedTitleId && !achievementIds.includes(requestedTitleId)) {
        throw new HandlerError(
          'permission-denied',
          'That title has not been unlocked',
        );
      }
      const identity = mode === 'edit' ? profile : current ?? profile;
      const next: PublicProfile = {
        ...identity,
        id: profile.id,
        role: profile.role,
        achievementIds,
        selectedTitleId: requestedTitleId,
      };
      const { id: _id, ...data } = next;
      transaction.set(reference, data);
      return next;
    });
  },

  async countUserSightings(id) {
    const [privateContributors, legacySightings] = await Promise.all([
      firestore
        .collection('content-contributors')
        .where('user.id', '==', id)
        .get(),
      firestore
        .collection('cat-sightings')
        .where('createdBy.id', '==', id)
        .count()
        .get(),
    ]);
    const migratedSightings = privateContributors.docs.filter(
      (document) => document.data().kind === 'sighting',
    ).length;
    return migratedSightings + legacySightings.data().count;
  },

  async verifyProfilePhoto(id, url) {
    try {
      const parsed = new URL(url);
      const match = /^\/v0\/b\/([^/]+)\/o\/(.+)$/.exec(parsed.pathname);
      if (!match) return false;
      const bucket = storage.bucket();
      const bucketName = decodeURIComponent(match[1]);
      const objectPath = decodeURIComponent(match[2]);
      if (
        bucketName !== bucket.name ||
        !objectPath.startsWith(`public-profiles/${id}/`)
      ) {
        return false;
      }
      const [metadata] = await bucket.file(objectPath).getMetadata();
      const ownerId =
        metadata.metadata && typeof metadata.metadata.ownerId === 'string'
          ? metadata.metadata.ownerId
          : undefined;
      return (
        ownerId === id &&
        typeof metadata.contentType === 'string' &&
        metadata.contentType.startsWith('image/') &&
        Number(metadata.size) <= 10 * 1024 * 1024
      );
    } catch {
      return false;
    }
  },
};

const synchronizeInaturalist = () =>
  executeInaturalistSync({
    gateway: inaturalistGateway,
    repository: inaturalistRepository,
    clock: { now: () => new Date() },
    runId: randomUUID,
  });

const inaturalistDependencies: InaturalistHandlerDependencies = {
  getUser: dependencies.getUser,
  runSync: synchronizeInaturalist,
  moderate: (kind, id, hidden, reason, actorId) =>
    inaturalistRepository.moderate(
      kind,
      id,
      hidden,
      reason,
      actorId,
      new Date(),
    ),
  updateCatalogOverrides: (id, overrides) =>
    inaturalistRepository.updateCatalogOverrides(id, overrides),
  linkCatalog: (id, localCatalogId) =>
    inaturalistRepository.linkCatalog(id, localCatalogId),
};

async function execute<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HandlerError) {
      throw new HttpsError(error.code, error.message);
    }
    logger.error('Callable workflow failed', error);
    throw new HttpsError('internal', 'The requested operation could not be completed');
  }
}

const requestFor = <T>(request: CallableRequest<T>) => ({
  authUid: request.auth?.uid,
  data: request.data,
});

export const sendWhitelistEmail = onCall(
  { secrets: [SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleSendWhitelistEmail(requestFor(request), dependencies),
    ),
);

export const getBillingSummary = onCall((request) =>
  execute(() => handleGetBillingSummary(requestFor(request), dependencies)),
);

export const migrateContributorPrivacy = onCall((request) =>
  execute(() =>
    handleMigrateContributorPrivacy(requestFor(request), dependencies),
  ),
);

export const syncPublicProfile = onCall((request) =>
  execute(() => handleSyncPublicProfile(requestFor(request), dependencies)),
);

export const updatePublicProfile = onCall((request) =>
  execute(() => handleUpdatePublicProfile(requestFor(request), dependencies)),
);

export const selectProfileTitle = onCall((request) =>
  execute(() => handleSelectProfileTitle(requestFor(request), dependencies)),
);

export const createWhitelistUser = onCall((request) =>
  execute(() => handleCreateWhitelistUser(requestFor(request), dependencies)),
);

export const removeWhitelistUser = onCall((request) =>
  execute(() => handleRemoveManagedUser(requestFor(request), dependencies)),
);

export const updateUserRole = onCall((request) =>
  execute(() => handleUpdateUserRole(requestFor(request), dependencies)),
);

export const addDisciplinaryNotice = onCall((request) =>
  execute(() => handleAddDisciplinaryNotice(requestFor(request), dependencies)),
);

export const setUserBanned = onCall((request) =>
  execute(() => handleSetUserBanned(requestFor(request), dependencies)),
);

export const transferPresidency = onCall((request) =>
  execute(() => handleTransferPresidency(requestFor(request), dependencies)),
);

export const removeManagedUser = onCall((request) =>
  execute(() => handleRemoveManagedUser(requestFor(request), dependencies)),
);

export const sendAnnouncement = onCall((request) =>
  execute(() => handleSendAnnouncement(requestFor(request), dependencies)),
);

export const submitWhitelistApplication = onCall((request) =>
  execute(() =>
    handleSubmitWhitelistApplication(requestFor(request), dependencies),
  ),
);

export const runInaturalistSync = onCall((request) =>
  execute(() =>
    handleRunInaturalistSync(requestFor(request), inaturalistDependencies),
  ),
);

export const moderateInaturalistRecord = onCall((request) =>
  execute(() =>
    handleModerateInaturalistRecord(
      requestFor(request),
      inaturalistDependencies,
    ),
  ),
);

export const updateInaturalistCatalog = onCall((request) =>
  execute(() =>
    handleUpdateInaturalistCatalog(
      requestFor(request),
      inaturalistDependencies,
    ),
  ),
);

export const linkInaturalistCatalog = onCall((request) =>
  execute(() =>
    handleLinkInaturalistCatalog(
      requestFor(request),
      inaturalistDependencies,
    ),
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
    const summary = await synchronizeInaturalist();
    logger.info('iNaturalist synchronization completed', summary);
    if (summary.status === 'partial' || summary.status === 'failed') {
      throw new Error(
        `iNaturalist synchronization completed with status ${summary.status}`,
      );
    }
  },
);
