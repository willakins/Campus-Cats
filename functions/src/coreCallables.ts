import { getApps, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/logger';
import {
  CallableRequest,
  HttpsError,
  onCall,
} from 'firebase-functions/v2/https';

import {
  HandlerError,
  ManagedUser,
  ProfileSyncDependencies,
  PublicProfile,
  handleSyncPublicProfile,
} from './handlers';
import {
  BallotDependencies,
  StoredCommunityVote,
  handleSubmitCommunityBallot,
} from './communityVoting';
import {
  assertCanParticipate,
  parseParticipationAudience,
} from './participation';

if (getApps().length === 0) initializeApp();

const firestore = getFirestore();
const tenantCollection = (clubId: string, collectionName: string) =>
  firestore.collection('clubs').doc(clubId).collection(collectionName);

const validAchievementIds: readonly PublicProfile['achievementIds'][number][] = [
  'profile-photo',
  'president',
  'first-sighting',
  'ten-sightings',
  'hundred-sightings',
];

const mergeAchievements = (
  ...groups: readonly (readonly PublicProfile['achievementIds'][number][])[]
) =>
  validAchievementIds.filter((id) =>
    groups.some((group) => group.includes(id)),
  );

const publicProfileFromData = (
  id: string,
  data: Record<string, unknown> | undefined,
  expectedClubId?: string,
): PublicProfile => {
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
  const storedAchievements: readonly unknown[] = Array.isArray(
    data.achievementIds,
  )
    ? data.achievementIds
    : [];
  const achievementIds = validAchievementIds.filter((id) =>
    storedAchievements.includes(id),
  );
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
};

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
  const clubData = (
    await firestore.collection('clubs').doc(clubId).get()
  ).data();
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

const profileDependencies: ProfileSyncDependencies = {
  getUser,
  async getPublicProfile(id, clubId) {
    const snapshot = await tenantCollection(clubId, 'public-profiles')
      .doc(id)
      .get();
    return snapshot.exists
      ? publicProfileFromData(id, snapshot.data(), clubId)
      : undefined;
  },
  async putPublicProfile(profile, mode, clubId) {
    const reference = tenantCollection(clubId, 'public-profiles').doc(
      profile.id,
    );
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.exists
        ? publicProfileFromData(snapshot.id, snapshot.data(), clubId)
        : undefined;
      const achievementIds = mergeAchievements(
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
  return {
    id,
    clubId,
    kind: data.kind,
    title: typeof data.title === 'string' ? data.title : undefined,
    participationAudience: parseParticipationAudience(
      data.participationAudience,
    ),
    votingStartsAtMillis: votingStartsAt.toMillis(),
    votingEndsAtMillis: votingEndsAt.toMillis(),
    options,
  };
};

const votingDependencies: BallotDependencies = {
  now: () => new Date(),
  getUser,
  async getVote(id, clubId) {
    const snapshot = await tenantCollection(clubId, 'community-votes')
      .doc(id)
      .get();
    return snapshot.exists
      ? storedCommunityVote(snapshot.id, clubId, snapshot.data())
      : undefined;
  },
  async submitBallot({ actor, vote, optionId, ballotId, submittedAt }) {
    const voteReference = tenantCollection(vote.clubId, 'community-votes').doc(
      vote.id,
    );
    const receiptReference = tenantCollection(
      vote.clubId,
      'community-vote-ballot-receipts',
    ).doc(`${actor.id}__${vote.id}`);
    const ballotReference = tenantCollection(
      vote.clubId,
      'community-vote-ballots',
    ).doc(ballotId);
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
      assertCanParticipate(
        canonical.participationAudience,
        actor.role,
        'vote',
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
          tenantCollection(vote.clubId, 'community-vote-nominees').doc(
            `${vote.id}__${optionId}`,
          ),
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
};

const requestFor = <T>(request: CallableRequest<T>) => ({
  authUid: request.auth?.uid,
  data: request.data,
});

const execute = async <T>(operation: () => Promise<T>): Promise<T> => {
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
};

export const submitCommunityBallot = onCall((request) =>
  execute(() =>
    handleSubmitCommunityBallot(requestFor(request), votingDependencies),
  ),
);

export const syncPublicProfile = onCall((request) =>
  execute(() =>
    handleSyncPublicProfile(requestFor(request), profileDependencies),
  ),
);
