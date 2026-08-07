import { createHash, randomBytes, randomUUID } from 'node:crypto';

import sgMail from '@sendgrid/mail';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import Stripe from 'stripe';
import { logger } from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import {
  CallableRequest,
  HttpsError,
  onCall,
  onRequest,
} from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  onDocumentWritten,
  onDocumentWrittenWithAuthContext,
} from 'firebase-functions/v2/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

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
import { CustomerBillingService } from './customerBilling';
import {
  handleCreateClubBillingPortalSession,
  handleCreateClubBillingSetupSession,
  handleGetClubBillingSummary,
  handlePayClubOutstandingInvoice,
  handleResumeClubSubscription,
  handleScheduleClubCancellation,
  handleSetClubCollectionMethod,
  handleUpdateClubBillingEmail,
} from './customerBillingHandlers';
import { deleteAuthUserIfPresent } from './firebaseAuth';
import { FirebaseInaturalistRepository } from './firebaseInaturalist';
import { FirebaseInaturalistAccountLinkRepository } from './firebaseInaturalistAccountLinks';
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
import {
  InaturalistAccountLinkingDependencies,
  handleBeginInaturalistAccountLink,
  handleGetInaturalistAccountLinkStatus,
  handleInaturalistAccountCallback,
  handleUnlinkInaturalistAccount,
} from './inaturalistAccountLinking';
import { InaturalistAccountHttpGateway } from './inaturalistAccountHttp';
import {
  SurveySubmissionDependencies,
  handleSubmitSurveyResponse,
  validateSurveyAnswers,
} from './surveySubmission';
import {
  CommunityVoteStartNotificationDependencies,
  CommunityVotingDependencies,
  StoredCommunityVote,
  handleGetCommunityVoteResults,
  handleSubmitCommunityBallot,
  handleSubmitCommunityNomination,
  notifyStartedPresidentialVotes,
} from './communityVoting';
import { handleSignedStripeWebhook } from './stripeWebhook';
import { ClubProvisioningService } from './clubProvisioning';
import { UniversityCatalogService } from './universityCatalog';
import {
  FirebaseClubSetupRequestRepository,
  UniversityOnboardingDependencies,
  handleGetUniversity,
  handleRequestClubSetup,
  handleSearchUniversities,
  handleVerifyClubSetup,
} from './universityOnboarding';

if (getApps().length === 0) initializeApp();

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
const COLLEGE_SCORECARD_API_KEY = defineSecret('COLLEGE_SCORECARD_API_KEY');
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const STRIPE_ACTIVITY_PRICE_LOOKUP_KEY = defineString(
  'STRIPE_ACTIVITY_PRICE_LOOKUP_KEY',
);
const STRIPE_MEDIA_PRICE_LOOKUP_KEY = defineString(
  'STRIPE_MEDIA_PRICE_LOOKUP_KEY',
);
const STRIPE_ACTIVITY_METER_EVENT = defineString(
  'STRIPE_ACTIVITY_METER_EVENT',
  { default: 'activity_units' },
);
const STRIPE_MEDIA_METER_EVENT = defineString('STRIPE_MEDIA_METER_EVENT', {
  default: 'media_bytes',
});
const STRIPE_AUTOMATIC_TAX = defineString('STRIPE_AUTOMATIC_TAX', {
  default: 'true',
});
const BILLING_WEB_APP_ORIGIN = defineString('BILLING_WEB_APP_ORIGIN', {
  default: 'https://campuscats-d7a5e.web.app',
});
const CLUB_ONBOARDING_WEB_ORIGIN = defineString('CLUB_ONBOARDING_WEB_ORIGIN', {
  default: 'https://campuscats-d7a5e.web.app',
});
const INVITATION_FROM_EMAIL = defineString('INVITATION_FROM_EMAIL', {
  default: 'gtcampuscats@gmail.com',
});
const INATURALIST_OAUTH_CLIENT_SECRET = defineSecret(
  'INATURALIST_OAUTH_CLIENT_SECRET',
);
const INATURALIST_OAUTH_CLIENT_ID = defineString(
  'INATURALIST_OAUTH_CLIENT_ID',
);
const INATURALIST_OAUTH_REDIRECT_URI = defineString(
  'INATURALIST_OAUTH_REDIRECT_URI',
);
const INATURALIST_APP_RETURN_URI = defineString('INATURALIST_APP_RETURN_URI', {
  default: 'campuscats://settings/inaturalist-account',
});
const firestore = getFirestore();
const auth = getAuth();
const storage = getStorage();
const billingReader = createGoogleCloudBillingReader();
const inaturalistGateway = new InaturalistHttpGateway();
const inaturalistAccountRepository =
  new FirebaseInaturalistAccountLinkRepository(firestore);
const tenantCollection = (clubId: string, collectionName: string) =>
  firestore.collection('clubs').doc(clubId).collection(collectionName);
const inaturalistAccountConfig = {
  get clientId() {
    return INATURALIST_OAUTH_CLIENT_ID.value();
  },
  get clientSecret() {
    return INATURALIST_OAUTH_CLIENT_SECRET.value();
  },
  get redirectUri() {
    return INATURALIST_OAUTH_REDIRECT_URI.value();
  },
  get appReturnUri() {
    return INATURALIST_APP_RETURN_URI.value();
  },
};
const inaturalistAccountDependencies: InaturalistAccountLinkingDependencies = {
  config: inaturalistAccountConfig,
  repository: inaturalistAccountRepository,
  oauth: new InaturalistAccountHttpGateway(inaturalistAccountConfig),
  now: () => new Date(),
  getUser: (id) => dependencies.getUser(id),
};

const universityCatalog = new UniversityCatalogService(
  firestore,
  () => COLLEGE_SCORECARD_API_KEY.value(),
);
const clubSetupRequests = new FirebaseClubSetupRequestRepository(firestore);
const onboardingEmail = async (
  to: string,
  subject: string,
  paragraphs: readonly string[],
) => {
  sgMail.setApiKey(SENDGRID_API_KEY.value());
  await sgMail.send({
    to,
    from: INVITATION_FROM_EMAIL.value(),
    subject,
    text: `${paragraphs.join('\n\n')}\n\nQuestions? Contact willakins23@gmail.com.`,
  });
};
const universityOnboardingDependencies = (): UniversityOnboardingDependencies => {
  const provisioner = new ClubProvisioningService({
    firestore,
    auth,
    webOrigin: () => CLUB_ONBOARDING_WEB_ORIGIN.value(),
    sendPasswordSetup: (email, clubName, link) => onboardingEmail(
      email,
      `Finish setting up ${clubName}`,
      [
        `Your verified ${clubName} club is ready on Campus Cats.`,
        'Set your password using the secure link below, then sign in to complete club billing.',
        link,
      ],
    ),
  });
  return {
    catalog: universityCatalog,
    requests: clubSetupRequests,
    provision: (request) => provisioner.provision(request),
    sendVerification: (email, clubName, requestId, token) => {
      const verification = new URL('/club-setup/verify', CLUB_ONBOARDING_WEB_ORIGIN.value());
      verification.searchParams.set('requestId', requestId);
      verification.searchParams.set('token', token);
      return onboardingEmail(
        email,
        `Verify your role as President of ${clubName}`,
        [
          `Someone selected you as the President of ${clubName} on Campus Cats.`,
          'Verify your school email within 24 hours to create the club. If you did not expect this, ignore this message.',
          verification.toString(),
        ],
      );
    },
    newId: randomUUID,
    newToken: () => randomBytes(32).toString('base64url'),
    hash: (value) => createHash('sha256').update(value).digest('hex'),
    now: () => new Date(),
  };
};

const customerBillingService = () =>
  new CustomerBillingService({
    firestore,
    stripe: new Stripe(STRIPE_SECRET_KEY.value()),
    config: {
      activityPriceLookupKey: STRIPE_ACTIVITY_PRICE_LOOKUP_KEY.value(),
      mediaPriceLookupKey: STRIPE_MEDIA_PRICE_LOOKUP_KEY.value(),
      activityMeterEventName: STRIPE_ACTIVITY_METER_EVENT.value(),
      mediaMeterEventName: STRIPE_MEDIA_METER_EVENT.value(),
      automaticTax: STRIPE_AUTOMATIC_TAX.value() !== 'false',
      webAppOrigin: BILLING_WEB_APP_ORIGIN.value(),
    },
    notify: async (club, subject, message) => {
      const presidents = await firestore
        .collection('users')
        .where('clubId', '==', club.id)
        .where('role', '==', 3)
        .get();
      const recipients = [
        club.billingEmail,
        ...presidents.docs.map((document) => document.data().email),
      ].filter(
        (email, index, all): email is string =>
          typeof email === 'string' &&
          email.includes('@') &&
          all.indexOf(email) === index,
      );
      if (!recipients.length) return;
      sgMail.setApiKey(SENDGRID_API_KEY.value());
      await sgMail.send({
        to: recipients,
        from: 'gtcampuscats@gmail.com',
        subject,
        text: `${message}\n\nQuestions? Contact willakins23@gmail.com.`,
      });
    },
  });

const publicProfileDefaults = (email: string, role: number, clubId: string) => ({
  displayName: (email.split('@')[0]?.trim() || 'Campus Cats member').slice(
    0,
    60,
  ),
  bio: '',
  profilePhotoUrl: '',
  role,
  achievementIds: [],
  selectedTitleId: '',
  clubId,
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
  expectedClubId?: string,
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
  const clubId =
    typeof data.clubId === 'string' ? data.clubId : expectedClubId;
  if (!clubId || (expectedClubId && clubId !== expectedClubId)) {
    throw new HandlerError('not-found', 'Member profile not found');
  }
  return {
    id,
    displayName: data.displayName,
    bio: data.bio,
    profilePhotoUrl: data.profilePhotoUrl,
    role: data.role,
    achievementIds,
    selectedTitleId,
    clubId,
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
    const clubId =
      typeof data.clubId === 'string' ? data.clubId : 'campus-cats';
    const club = await firestore.collection('clubs').doc(clubId).get();
    const clubData = club.data();
    const now = new Date();
    const graceEndsAt = clubData?.graceEndsAt instanceof Timestamp
      ? clubData.graceEndsAt.toDate()
      : undefined;
    const scheduledEndAt = clubData?.scheduledEndAt instanceof Timestamp
      ? clubData.scheduledEndAt.toDate()
      : undefined;
    const hasAccess =
      clubData?.maintenanceMode !== true &&
      (
        clubData?.billingEnforcementEnabled !== true ||
        (
          clubData?.accessState === 'enabled' &&
          (!graceEndsAt || now < graceEndsAt) &&
          (!scheduledEndAt || now < scheduledEndAt)
        )
      );
    if (!hasAccess) return undefined;
    return {
      id: snapshot.id,
      email: data.email,
      role: data.role,
      clubId,
      platformAdmin: data.platformAdmin === true,
      banned: data.banned === true,
    };
  },

  async getPlatformAdmin(id) {
    const snapshot = await firestore.collection('users').doc(id).get();
    const data = snapshot.data();
    if (
      !snapshot.exists ||
      data?.banned === true ||
      data?.platformAdmin !== true ||
      typeof data.email !== 'string' ||
      (data.role !== 0 &&
        data.role !== 1 &&
        data.role !== 2 &&
        data.role !== 3 &&
        data.role !== 4)
    ) {
      return undefined;
    }
    return {
      id: snapshot.id,
      email: data.email,
      role: data.role,
      clubId: typeof data.clubId === 'string' ? data.clubId : 'campus-cats',
      platformAdmin: true,
      banned: false,
    };
  },

  getBillingSummary: () => billingReader.getSummary(),

  async migrateContributorPrivacy(clubId) {
    const migrateCollection = async (
      collectionName: 'cat-sightings' | 'catalog',
      kind: 'sighting' | 'catalog',
    ): Promise<number> => {
      const snapshot = await tenantCollection(clubId, collectionName).get();
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
            tenantCollection(clubId, 'content-contributors').doc(`${kind}__${document.id}`),
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

  async listPushTokens(clubId) {
    const snapshot = await firestore
      .collection('users')
      .where('clubId', '==', clubId)
      .get();
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
    await deleteAuthUserIfPresent(auth, id);
  },

  async putUser(user) {
    const batch = firestore.batch();
    batch.set(firestore.collection('users').doc(user.id), {
      email: user.email,
      role: user.role,
      clubId: user.clubId,
      platformAdmin: user.platformAdmin === true,
      banned: false,
      disciplinaryNotices: [],
    });
    batch.set(
      tenantCollection(user.clubId, 'public-profiles').doc(user.id),
      publicProfileDefaults(user.email, user.role, user.clubId),
    );
    await batch.commit();
  },

  async deleteUser(id) {
    const user = await firestore.collection('users').doc(id).get();
    const clubId = typeof user.data()?.clubId === 'string'
      ? user.data()!.clubId
      : 'campus-cats';
    await inaturalistAccountRepository.unlink(id);
    const batch = firestore.batch();
    batch.delete(firestore.collection('users').doc(id));
    batch.delete(tenantCollection(clubId, 'public-profiles').doc(id));
    batch.delete(tenantCollection(clubId, 'catalog-favorites').doc(id));
    await batch.commit();
  },

  async updateUserRole(id, role) {
    const reference = firestore.collection('users').doc(id);
    await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) {
        throw new HandlerError('not-found', 'User not found');
      }
      if (snapshot.data()?.banned === true) {
        throw new HandlerError(
          'permission-denied',
          'Unban this account before changing its role',
        );
      }
      const clubId = String(snapshot.data()?.clubId ?? 'campus-cats');
      const publicReference = tenantCollection(clubId, 'public-profiles').doc(id);
      const publicSnapshot = await transaction.get(publicReference);
      transaction.update(reference, { role });
      if (publicSnapshot.exists) {
        transaction.update(publicReference, { role });
      } else {
        transaction.set(
          publicReference,
          publicProfileDefaults(
            String(snapshot.data()?.email ?? ''),
            role,
            String(snapshot.data()?.clubId ?? 'campus-cats'),
          ),
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
      await inaturalistAccountRepository.unlink(id);
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
    await firestore.runTransaction(async (transaction) => {
      const actorForClub = await transaction.get(actorReference);
      const clubId = typeof actorForClub.data()?.clubId === 'string'
        ? actorForClub.data()!.clubId
        : 'campus-cats';
      const actorPublicReference = tenantCollection(clubId, 'public-profiles').doc(
        actorId,
      );
      const successorPublicReference = tenantCollection(
        clubId,
        'public-profiles',
      ).doc(successorId);
      const presidencyReference = tenantCollection(clubId, 'system').doc('presidency');
      const presidents = firestore
        .collection('users')
        .where('clubId', '==', clubId)
        .where('role', '==', 3);
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
      if (successor?.clubId !== clubId) {
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
            ...publicProfileDefaults(String(actor?.email ?? ''), 1, clubId),
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
          ...publicProfileDefaults(String(successor?.email ?? ''), 3, clubId),
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

  async findWhitelistByEmail(email, clubId) {
    const [club, mapping, snapshot] = await Promise.all([
      firestore.collection('clubs').doc(clubId).get(),
      firestore.collection('university-clubs').where('clubId', '==', clubId).limit(1).get(),
      tenantCollection(clubId, 'whitelist')
      .where('email', '==', email)
      .limit(1)
      .get(),
    ]);
    if (!club.exists || mapping.empty) {
      throw new HandlerError('not-found', 'University club not found');
    }
    return !snapshot.empty;
  },

  async createWhitelistApplication(application: WhitelistApplication, clubId) {
    const id = createHash('sha256')
      .update(application.email.toLowerCase())
      .digest('hex');
    try {
      await tenantCollection(clubId, 'whitelist').doc(id).create(application);
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

  async getPublicProfile(id, clubId): Promise<PublicProfile | undefined> {
    const snapshot = await tenantCollection(clubId, 'public-profiles').doc(id).get();
    if (!snapshot.exists) return undefined;
    return publicProfileFromData(id, snapshot.data(), clubId);
  },

  async putPublicProfile(profile, mode, clubId) {
    const reference = tenantCollection(clubId, 'public-profiles').doc(profile.id);
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists
        ? publicProfileFromData(snapshot.id, snapshot.data(), clubId)
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
        clubId,
      };
      const { id: _id, ...data } = next;
      transaction.set(reference, data);
      return next;
    });
  },

  async countUserSightings(id, clubId) {
    const [privateContributors, legacySightings] = await Promise.all([
      tenantCollection(clubId, 'content-contributors')
        .where('user.id', '==', id)
        .get(),
      tenantCollection(clubId, 'cat-sightings')
        .where('createdBy.id', '==', id)
        .count()
        .get(),
    ]);
    const migratedSightings = privateContributors.docs.filter(
      (document) => document.data().kind === 'sighting',
    ).length;
    return migratedSightings + legacySightings.data().count;
  },

  async verifyProfilePhoto(id, url, clubId) {
    try {
      const parsed = new URL(url);
      const match = /^\/v0\/b\/([^/]+)\/o\/(.+)$/.exec(parsed.pathname);
      if (!match) return false;
      const bucket = storage.bucket();
      const bucketName = decodeURIComponent(match[1]);
      const objectPath = decodeURIComponent(match[2]);
      if (
        bucketName !== bucket.name ||
        !objectPath.startsWith(`clubs/${clubId}/public-profiles/${id}/`)
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

const synchronizeInaturalist = (clubId: string) =>
  executeInaturalistSync({
    gateway: inaturalistGateway,
    repository: new FirebaseInaturalistRepository(firestore, clubId),
    clock: { now: () => new Date() },
    runId: randomUUID,
  });

const surveySubmissionDependencies: SurveySubmissionDependencies = {
  getUser: dependencies.getUser,
  async submit({ actor, surveyId, answers, responseId }) {
    const surveyReference = tenantCollection(actor.clubId, 'community-surveys').doc(
      surveyId,
    );
    const responseReference = tenantCollection(actor.clubId, 'survey-responses').doc(
      responseId,
    );
    const receiptReference = tenantCollection(
      actor.clubId,
      'survey-submission-receipts',
    )
      .doc(`${actor.id}__${surveyId}`);

    return firestore.runTransaction(async (transaction) => {
      const [surveySnapshot, receiptSnapshot] = await transaction.getAll(
        surveyReference,
        receiptReference,
      );
      if (!surveySnapshot.exists) {
        throw new HandlerError('not-found', 'Survey not found');
      }
      if (receiptSnapshot.exists) {
        throw new HandlerError(
          'already-exists',
          'You already submitted this survey',
        );
      }
      const surveyData = surveySnapshot.data();
      if (!surveyData) {
        throw new HandlerError('internal', 'Stored survey is invalid');
      }
      validateSurveyAnswers(surveyData, answers);

      const submittedAt = Timestamp.now();
      const response = {
        surveyId,
        answers,
        submittedAt,
        writeSource: 'user',
        billingActorId: actor.id,
        ...(surveyData.anonymous === false
          ? {
              respondent: {
                id: actor.id,
                email: actor.email,
                role: actor.role,
                clubId: actor.clubId,
                platformAdmin: actor.platformAdmin === true,
              },
            }
          : {}),
      };
      transaction.create(responseReference, response);
      transaction.create(receiptReference, {
        surveyId,
        responseId,
        userId: actor.id,
        submittedAt,
      });
      return { responseId, submittedAtMillis: submittedAt.toMillis() };
    });
  },
};

const storedCommunityVote = (
  id: string,
  clubId: string,
  data: Record<string, unknown> | undefined,
): StoredCommunityVote => {
  const votingStartsAt = data?.votingStartsAt;
  const votingEndsAt = data?.votingEndsAt;
  if (
    (data?.kind !== 'contest' && data?.kind !== 'presidential_election') ||
    !(votingStartsAt instanceof Timestamp) ||
    !(votingEndsAt instanceof Timestamp) ||
    !Array.isArray(data.options)
  ) {
    throw new HandlerError('internal', 'Stored community vote is invalid');
  }
  const options = data.options.map((option) => {
    if (
      typeof option !== 'object' ||
      option === null ||
      typeof option.id !== 'string' ||
      typeof option.label !== 'string' ||
      ('imageUrl' in option && typeof option.imageUrl !== 'string')
    ) {
      throw new HandlerError('internal', 'Stored voting options are invalid');
    }
    return {
      id: option.id,
      label: option.label,
      ...(typeof option.imageUrl === 'string'
        ? { imageUrl: option.imageUrl }
        : {}),
    };
  });
  const notificationSentAt = data.votingNotificationSentAt;
  if (
    notificationSentAt !== undefined &&
    !(notificationSentAt instanceof Timestamp)
  ) {
    throw new HandlerError('internal', 'Stored notification state is invalid');
  }
  return {
    id,
    clubId,
    kind: data.kind,
    title: typeof data.title === 'string' ? data.title : undefined,
    votingStartsAtMillis: votingStartsAt.toMillis(),
    votingEndsAtMillis: votingEndsAt.toMillis(),
    options,
    ...(notificationSentAt instanceof Timestamp
      ? { votingNotificationSentAtMillis: notificationSentAt.toMillis() }
      : {}),
  };
};

const communityVotingDependencies: CommunityVotingDependencies = {
  now: () => new Date(),
  getUser: dependencies.getUser,
  async getVote(id, clubId) {
    const snapshot = await tenantCollection(clubId, 'community-votes').doc(id).get();
    return snapshot.exists
      ? storedCommunityVote(snapshot.id, clubId, snapshot.data())
      : undefined;
  },
  async submitNomination({ actor, vote, action, submittedAt }) {
    const voteReference = tenantCollection(vote.clubId, 'community-votes').doc(
      vote.id,
    );
    const receiptReference = tenantCollection(
      vote.clubId,
      'community-vote-nomination-receipts',
    )
      .doc(`${actor.id}__${vote.id}`);
    const nomineeReference = tenantCollection(
      vote.clubId,
      'community-vote-nominees',
    )
      .doc(`${vote.id}__${actor.id}`);
    const profileReference = tenantCollection(
      vote.clubId,
      'public-profiles',
    ).doc(actor.id);
    return firestore.runTransaction(async (transaction) => {
      const [voteSnapshot, receiptSnapshot, profileSnapshot] =
        await transaction.getAll(
          voteReference,
          receiptReference,
          profileReference,
        );
      if (!voteSnapshot.exists) {
        throw new HandlerError('not-found', 'Vote not found');
      }
      if (receiptSnapshot.exists) {
        throw new HandlerError(
          'already-exists',
          'You already responded to nominations',
        );
      }
      const canonical = storedCommunityVote(
        voteSnapshot.id,
        vote.clubId,
        voteSnapshot.data(),
      );
      if (canonical.kind !== 'presidential_election') {
        throw new HandlerError(
          'failed-precondition',
          'This vote does not have nominations',
        );
      }
      const now = Timestamp.fromDate(submittedAt);
      if (now.toMillis() >= canonical.votingStartsAtMillis) {
        throw new HandlerError('failed-precondition', 'Nominations are closed');
      }
      transaction.create(receiptReference, {
        voteId: vote.id,
        userId: actor.id,
        action,
        submittedAt: now,
      });
      if (action === 'nominate') {
        const displayName =
          typeof profileSnapshot.data()?.displayName === 'string'
            ? profileSnapshot.data()?.displayName.trim().slice(0, 60)
            : actor.email.split('@')[0]?.trim().slice(0, 60);
        transaction.create(nomineeReference, {
          voteId: vote.id,
          userId: actor.id,
          displayName: displayName || 'Campus Cats member',
          nominatedAt: now,
          writeSource: 'user',
          billingActorId: actor.id,
        });
      }
      return {
        action,
        ...(action === 'nominate' ? { candidateId: actor.id } : {}),
        submittedAt,
      };
    });
  },
  async submitBallot({ actor, vote, optionId, ballotId, submittedAt }) {
    const voteReference = tenantCollection(vote.clubId, 'community-votes').doc(
      vote.id,
    );
    const receiptReference = tenantCollection(
      vote.clubId,
      'community-vote-ballot-receipts',
    )
      .doc(`${actor.id}__${vote.id}`);
    const ballotReference = tenantCollection(vote.clubId, 'community-vote-ballots')
      .doc(ballotId);
    return firestore.runTransaction(async (transaction) => {
      const [voteSnapshot, receiptSnapshot] = await transaction.getAll(
        voteReference,
        receiptReference,
      );
      if (!voteSnapshot.exists) {
        throw new HandlerError('not-found', 'Vote not found');
      }
      if (receiptSnapshot.exists) {
        throw new HandlerError('already-exists', 'You already voted');
      }
      const canonical = storedCommunityVote(
        voteSnapshot.id,
        vote.clubId,
        voteSnapshot.data(),
      );
      const now = Timestamp.fromDate(submittedAt);
      if (now.toMillis() < canonical.votingStartsAtMillis) {
        throw new HandlerError('failed-precondition', 'Voting has not started');
      }
      if (now.toMillis() >= canonical.votingEndsAtMillis) {
        throw new HandlerError('failed-precondition', 'Voting is closed');
      }
      if (canonical.kind === 'contest') {
        if (!canonical.options.some(({ id }) => id === optionId)) {
          throw new HandlerError(
            'invalid-argument',
            'Choose a valid voting option',
          );
        }
      } else {
        const nominee = await transaction.get(
          tenantCollection(vote.clubId, 'community-vote-nominees')
            .doc(`${vote.id}__${optionId}`),
        );
        if (!nominee.exists || nominee.data()?.voteId !== vote.id) {
          throw new HandlerError(
            'invalid-argument',
            'Choose a valid presidential nominee',
          );
        }
      }
      transaction.create(ballotReference, {
        voteId: vote.id,
        optionId,
        submittedAt: now,
        writeSource: 'user',
        billingActorId: actor.id,
      });
      transaction.create(receiptReference, {
        voteId: vote.id,
        userId: actor.id,
        ballotId,
        submittedAt: now,
      });
      return { ballotId, optionId, submittedAt };
    });
  },
  async getResults(vote) {
    const ballots = await tenantCollection(vote.clubId, 'community-vote-ballots')
      .where('voteId', '==', vote.id)
      .get();
    const options =
      vote.kind === 'contest'
        ? vote.options
        : (
            await tenantCollection(vote.clubId, 'community-vote-nominees')
              .where('voteId', '==', vote.id)
              .get()
          ).docs.flatMap((document) => {
            const data = document.data();
            return typeof data.userId === 'string' &&
              typeof data.displayName === 'string'
              ? [{ id: data.userId, label: data.displayName }]
              : [];
          });
    const counts = new Map(options.map(({ id }) => [id, 0]));
    for (const ballot of ballots.docs) {
      const optionId = ballot.data().optionId;
      if (typeof optionId === 'string' && counts.has(optionId)) {
        counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
      }
    }
    return {
      totalVotes: ballots.size,
      options: options
        .map((option) => ({
          ...option,
          votes: counts.get(option.id) ?? 0,
        }))
        .sort(
          (left, right) =>
            right.votes - left.votes || left.label.localeCompare(right.label),
        ),
    };
  },
};

const broadcastNotification = async (
  notification: { readonly title: string; readonly body: string },
  clubId: string,
) => {
  const tokens = [...new Set(await dependencies.listPushTokens(clubId))];
  for (let offset = 0; offset < tokens.length; offset += 100) {
    await dependencies.sendPushBatch(
      tokens.slice(offset, offset + 100).map((token) => ({
        to: token,
        sound: 'default' as const,
        title: notification.title,
        body: notification.body,
      })),
    );
  }
};

const communityVoteNotificationDependencies: CommunityVoteStartNotificationDependencies = {
  now: () => new Date(),
  async listElectionVotes() {
    const clubs = await firestore.collection('clubs').get();
    const votes = await Promise.all(
      clubs.docs.map(async (club) => {
        const snapshot = await tenantCollection(club.id, 'community-votes')
          .where('kind', '==', 'presidential_election')
          .get();
        return snapshot.docs.flatMap((document) => {
          try {
            return [storedCommunityVote(document.id, club.id, document.data())];
          } catch {
            logger.warn('Skipping invalid presidential election', {
              clubId: club.id,
              voteId: document.id,
            });
            return [];
          }
        });
      }),
    );
    return votes.flat();
  },
  sendNotification: broadcastNotification,
  async markNotificationSent(vote, sentAt) {
    await tenantCollection(vote.clubId, 'community-votes').doc(vote.id).update({
      votingNotificationSentAt: Timestamp.fromDate(sentAt),
    });
  },
};

const inaturalistDependencies: InaturalistHandlerDependencies = {
  getUser: dependencies.getUser,
  runSync: synchronizeInaturalist,
  moderate: (kind, id, hidden, reason, actorId, clubId) =>
    new FirebaseInaturalistRepository(firestore, clubId).moderate(
      kind,
      id,
      hidden,
      reason,
      actorId,
      new Date(),
    ),
  updateCatalogOverrides: (id, overrides, clubId) =>
    new FirebaseInaturalistRepository(firestore, clubId).updateCatalogOverrides(
      id,
      overrides,
    ),
  linkCatalog: (id, localCatalogId, clubId) =>
    new FirebaseInaturalistRepository(firestore, clubId).linkCatalog(
      id,
      localCatalogId,
    ),
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

export const searchUniversities = onCall((request) =>
  execute(() => handleSearchUniversities(
    { data: request.data, clientIp: request.rawRequest.ip },
    universityOnboardingDependencies(),
  )),
);

export const getUniversity = onCall((request) =>
  execute(() => handleGetUniversity(
    { data: request.data, clientIp: request.rawRequest.ip },
    universityOnboardingDependencies(),
  )),
);

export const requestClubSetup = onCall(
  { secrets: [SENDGRID_API_KEY] },
  (request) => execute(() => handleRequestClubSetup(
    { data: request.data, clientIp: request.rawRequest.ip },
    universityOnboardingDependencies(),
  )),
);

export const verifyClubSetup = onCall(
  { secrets: [SENDGRID_API_KEY] },
  (request) => execute(() => handleVerifyClubSetup(
    { data: request.data, clientIp: request.rawRequest.ip },
    universityOnboardingDependencies(),
  )),
);

export const getBillingSummary = onCall((request) =>
  execute(() => handleGetBillingSummary(requestFor(request), dependencies)),
);

export const getClubBillingSummary = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleGetClubBillingSummary(requestFor(request), customerBillingService()),
    ),
);

export const createClubBillingSetupSession = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleCreateClubBillingSetupSession(
        requestFor(request),
        customerBillingService(),
      ),
    ),
);

export const createClubBillingPortalSession = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleCreateClubBillingPortalSession(
        requestFor(request),
        customerBillingService(),
      ),
    ),
);

export const payClubOutstandingInvoice = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handlePayClubOutstandingInvoice(
        requestFor(request),
        customerBillingService(),
      ),
    ),
);

export const setClubCollectionMethod = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleSetClubCollectionMethod(
        requestFor(request),
        customerBillingService(),
      ),
    ),
);

export const updateClubBillingEmail = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleUpdateClubBillingEmail(
        requestFor(request),
        customerBillingService(),
      ),
    ),
);

export const scheduleClubCancellation = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleScheduleClubCancellation(
        requestFor(request),
        customerBillingService(),
      ),
    ),
);

export const resumeClubSubscription = onCall(
  { secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY] },
  (request) =>
    execute(() =>
      handleResumeClubSubscription(
        requestFor(request),
        customerBillingService(),
      ),
    ),
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

export const submitSurveyResponse = onCall((request) =>
  execute(() =>
    handleSubmitSurveyResponse(requestFor(request), surveySubmissionDependencies),
  ),
);

export const submitCommunityNomination = onCall((request) =>
  execute(() =>
    handleSubmitCommunityNomination(
      requestFor(request),
      communityVotingDependencies,
    ),
  ),
);

export const submitCommunityBallot = onCall((request) =>
  execute(() =>
    handleSubmitCommunityBallot(
      requestFor(request),
      communityVotingDependencies,
    ),
  ),
);

export const getCommunityVoteResults = onCall((request) =>
  execute(() =>
    handleGetCommunityVoteResults(
      requestFor(request),
      communityVotingDependencies,
    ),
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

export const beginInaturalistAccountLink = onCall((request) =>
  execute(() =>
    handleBeginInaturalistAccountLink(
      requestFor(request),
      inaturalistAccountDependencies,
    ),
  ),
);

export const getInaturalistAccountLinkStatus = onCall((request) =>
  execute(() =>
    handleGetInaturalistAccountLinkStatus(
      requestFor(request),
      inaturalistAccountDependencies,
    ),
  ),
);

export const unlinkInaturalistAccount = onCall((request) =>
  execute(() =>
    handleUnlinkInaturalistAccount(
      requestFor(request),
      inaturalistAccountDependencies,
    ),
  ),
);

export const inaturalistAccountCallback = onRequest(
  { secrets: [INATURALIST_OAUTH_CLIENT_SECRET] },
  async (request, response) => {
    response.set('Cache-Control', 'no-store');
    response.set('Referrer-Policy', 'no-referrer');
    try {
      const result = await handleInaturalistAccountCallback(
        {
          state: request.query.state,
          code: request.query.code,
          error: request.query.error,
        },
        inaturalistAccountDependencies,
      );
      response.redirect(302, result.redirectUrl);
    } catch {
      logger.error('iNaturalist account callback failed');
      response.redirect(
        302,
        `${INATURALIST_APP_RETURN_URI.value()}?result=error`,
      );
    }
  },
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
      throw new Error(`iNaturalist synchronization failures: ${failures.join(', ')}`);
    }
  },
);

export const syncUniversityCatalogDaily = onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'America/New_York',
    secrets: [COLLEGE_SCORECARD_API_KEY],
  },
  async () => {
    const result = await universityCatalog.sync();
    logger.info('University catalog synchronized', result);
  },
);

export const stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SENDGRID_API_KEY] },
  async (request, response) => {
    const signature = request.header('stripe-signature');
    if (!signature) {
      response.status(400).send('Missing Stripe signature');
      return;
    }
    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      await handleSignedStripeWebhook(
        {
          payload: request.rawBody,
          signature,
          secret: STRIPE_WEBHOOK_SECRET.value(),
        },
        stripe.webhooks,
        (event) => customerBillingService().handleWebhook(event),
      );
      response.status(200).json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook failed', error);
      response.status(400).send('Webhook could not be processed');
    }
  },
);

export const meterClubActivity = onDocumentWrittenWithAuthContext(
  {
    document: 'clubs/{clubId}/{collectionId}/{documentId}',
    secrets: [STRIPE_SECRET_KEY],
  },
  async (event) => {
    const before = event.data?.before.exists === true;
    const after = event.data?.after.exists === true;
    const operation = !before && after ? 'create' : before && !after ? 'delete' : 'update';
    const data = after ? event.data?.after.data() : event.data?.before.data();
    const internalActorId =
      ['survey-responses', 'community-vote-nominees', 'community-vote-ballots'].includes(
        event.params.collectionId,
      ) &&
      data?.writeSource === 'user' &&
      typeof data.billingActorId === 'string'
        ? data.billingActorId
        : undefined;
    const actorId =
      event.authType === 'unknown' && event.authId
        ? event.authId
        : internalActorId;
    await customerBillingService().recordActivity({
      eventId: event.id,
      clubId: event.params.clubId,
      collection: event.params.collectionId,
      operation,
      occurredAt: new Date(event.time),
      initiatedBy: actorId ? 'user' : 'system',
      ...(actorId ? { actorId } : {}),
    });
  },
);

export const projectClubAccess = onDocumentWritten(
  'clubs/{clubId}',
  async (event) => {
    const clubId = event.params.clubId;
    const after = event.data?.after;
    const reference = firestore
      .collection('clubs')
      .doc(clubId)
      .collection('access')
      .doc('public');
    if (!after?.exists) {
      await reference.delete();
      return;
    }
    const data = after.data();
    if (!data) return;
    await reference.set({
      clubId,
      clubName: data.name,
      timezone: data.timezone,
      billingEnforcementEnabled: data.billingEnforcementEnabled === true,
      maintenanceMode: data.maintenanceMode === true,
      accessState: data.accessState,
      paymentStanding: data.paymentStanding,
      collectionMethod: data.collectionMethod,
      ...(data.invoiceDueAt ? { invoiceDueAt: data.invoiceDueAt } : {}),
      ...(data.graceEndsAt ? { graceEndsAt: data.graceEndsAt } : {}),
      ...(data.scheduledEndAt ? { scheduledEndAt: data.scheduledEndAt } : {}),
      ...(data.suspensionReason
        ? { suspensionReason: data.suspensionReason }
        : {}),
      updatedAt: Timestamp.now(),
    });
  },
);

export const meterClubMedia = onObjectFinalized(
  { secrets: [STRIPE_SECRET_KEY] },
  async (event) => {
    const name = event.data.name;
    const bytes = Number(event.data.size ?? 0);
    if (
      !name ||
      !Number.isFinite(bytes) ||
      bytes <= 0 ||
      event.data.metadata?.billingInitiatedBy === 'system'
    ) {
      return;
    }
    await customerBillingService().recordMedia({
      eventId: event.id,
      objectName: name,
      bytes,
      occurredAt: new Date(event.data.timeCreated ?? event.time),
    });
  },
);

export const dispatchClubBillingUsage = onSchedule(
  {
    schedule: 'every 5 minutes',
    retryCount: 3,
    maxInstances: 1,
    secrets: [STRIPE_SECRET_KEY],
  },
  async () => {
    const sent = await customerBillingService().dispatchPendingUsage();
    logger.info('Dispatched club billing usage', { sent });
  },
);

export const reconcileClubBillingInvoices = onSchedule(
  {
    schedule: 'every 5 minutes',
    retryCount: 3,
    maxInstances: 1,
    secrets: [STRIPE_SECRET_KEY],
  },
  async () => {
    const finalized = await customerBillingService().reconcilePendingInvoices();
    logger.info('Reconciled club billing invoices', { finalized });
  },
);

export const enforceClubBillingDeadlines = onSchedule(
  {
    schedule: 'every 60 minutes',
    retryCount: 3,
    maxInstances: 1,
    secrets: [STRIPE_SECRET_KEY, SENDGRID_API_KEY],
  },
  async () => {
    const changed = await customerBillingService().enforceDeadlines();
    logger.info('Enforced club billing deadlines', { changed });
  },
);

export const notifyPresidentialVotingStarted = onSchedule(
  {
    schedule: '*/15 * * * *',
    timeZone: 'America/New_York',
    retryCount: 3,
    maxInstances: 1,
  },
  async () => {
    const sent = await notifyStartedPresidentialVotes(
      communityVoteNotificationDependencies,
    );
    logger.info('Presidential voting notifications processed', { sent });
  },
);
