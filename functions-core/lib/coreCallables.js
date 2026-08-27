"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPublicProfile = exports.submitCommunityBallot = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const logger_1 = require("firebase-functions/logger");
const https_1 = require("firebase-functions/v2/https");
const handlers_1 = require("./handlers");
const communityVoting_1 = require("./communityVoting");
const participation_1 = require("./participation");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const firestore = (0, firestore_1.getFirestore)();
const tenantCollection = (clubId, collectionName) => firestore.collection('clubs').doc(clubId).collection(collectionName);
const validAchievementIds = [
    'profile-photo',
    'president',
    'first-sighting',
    'ten-sightings',
    'hundred-sightings',
];
const mergeAchievements = (...groups) => validAchievementIds.filter((id) => groups.some((group) => group.includes(id)));
const publicProfileFromData = (id, data, expectedClubId) => {
    if (typeof data?.displayName !== 'string' ||
        typeof data.bio !== 'string' ||
        typeof data.profilePhotoUrl !== 'string' ||
        (data.role !== 0 &&
            data.role !== 1 &&
            data.role !== 2 &&
            data.role !== 3 &&
            data.role !== 4)) {
        throw new handlers_1.HandlerError('internal', 'Stored public profile is invalid');
    }
    const storedAchievements = Array.isArray(data.achievementIds)
        ? data.achievementIds
        : [];
    const achievementIds = validAchievementIds.filter((id) => storedAchievements.includes(id));
    const selectedTitleId = typeof data.selectedTitleId === 'string' &&
        achievementIds.includes(data.selectedTitleId)
        ? data.selectedTitleId
        : '';
    const clubId = typeof data.clubId === 'string' ? data.clubId : expectedClubId;
    if (!clubId || (expectedClubId && clubId !== expectedClubId)) {
        throw new handlers_1.HandlerError('not-found', 'Member profile not found');
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
const getUser = async (id) => {
    const snapshot = await firestore.collection('users').doc(id).get();
    if (!snapshot.exists)
        return undefined;
    const data = snapshot.data();
    if (typeof data?.email !== 'string' ||
        (data.role !== 0 &&
            data.role !== 1 &&
            data.role !== 2 &&
            data.role !== 3 &&
            data.role !== 4)) {
        throw new handlers_1.HandlerError('internal', 'Stored user profile is invalid');
    }
    const clubId = typeof data.clubId === 'string' ? data.clubId : 'campus-cats';
    const clubData = (await firestore.collection('clubs').doc(clubId).get()).data();
    const now = new Date();
    const graceEndsAt = clubData?.graceEndsAt instanceof firestore_1.Timestamp
        ? clubData.graceEndsAt.toDate()
        : undefined;
    const scheduledEndAt = clubData?.scheduledEndAt instanceof firestore_1.Timestamp
        ? clubData.scheduledEndAt.toDate()
        : undefined;
    const hasAccess = clubData?.maintenanceMode !== true &&
        (clubData?.billingEnforcementEnabled !== true ||
            (clubData?.accessState === 'enabled' &&
                (!graceEndsAt || now < graceEndsAt) &&
                (!scheduledEndAt || now < scheduledEndAt)));
    if (!hasAccess)
        return undefined;
    return {
        id: snapshot.id,
        email: data.email,
        role: data.role,
        clubId,
        platformAdmin: data.platformAdmin === true,
        banned: data.banned === true,
    };
};
const profileDependencies = {
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
        const reference = tenantCollection(clubId, 'public-profiles').doc(profile.id);
        return firestore.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(reference);
            const current = snapshot.exists
                ? publicProfileFromData(snapshot.id, snapshot.data(), clubId)
                : undefined;
            const achievementIds = mergeAchievements(current?.achievementIds ?? [], profile.achievementIds);
            const requestedTitleId = mode === 'title'
                ? profile.selectedTitleId
                : current?.selectedTitleId ?? profile.selectedTitleId;
            if (requestedTitleId && !achievementIds.includes(requestedTitleId)) {
                throw new handlers_1.HandlerError('permission-denied', 'That title has not been unlocked');
            }
            const identity = mode === 'edit' ? profile : current ?? profile;
            const next = {
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
        const migratedSightings = privateContributors.docs.filter((document) => document.data().kind === 'sighting').length;
        return migratedSightings + legacySightings.data().count;
    },
};
const storedCommunityVote = (id, clubId, data) => {
    const votingStartsAt = data?.votingStartsAt;
    const votingEndsAt = data?.votingEndsAt;
    if ((data?.kind !== 'contest' && data?.kind !== 'presidential_election') ||
        !(votingStartsAt instanceof firestore_1.Timestamp) ||
        !(votingEndsAt instanceof firestore_1.Timestamp) ||
        !Array.isArray(data.options)) {
        throw new handlers_1.HandlerError('internal', 'Stored community vote is invalid');
    }
    const options = data.options.map((option) => {
        if (typeof option !== 'object' ||
            option === null ||
            typeof option.id !== 'string' ||
            typeof option.label !== 'string' ||
            ('imageUrl' in option && typeof option.imageUrl !== 'string')) {
            throw new handlers_1.HandlerError('internal', 'Stored voting options are invalid');
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
        participationAudience: (0, participation_1.parseParticipationAudience)(data.participationAudience),
        votingStartsAtMillis: votingStartsAt.toMillis(),
        votingEndsAtMillis: votingEndsAt.toMillis(),
        options,
    };
};
const votingDependencies = {
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
        const voteReference = tenantCollection(vote.clubId, 'community-votes').doc(vote.id);
        const receiptReference = tenantCollection(vote.clubId, 'community-vote-ballot-receipts').doc(`${actor.id}__${vote.id}`);
        const ballotReference = tenantCollection(vote.clubId, 'community-vote-ballots').doc(ballotId);
        return firestore.runTransaction(async (transaction) => {
            const [voteSnapshot, receiptSnapshot] = await transaction.getAll(voteReference, receiptReference);
            if (!voteSnapshot.exists) {
                throw new handlers_1.HandlerError('not-found', 'Vote not found');
            }
            if (receiptSnapshot.exists) {
                throw new handlers_1.HandlerError('already-exists', 'You already voted');
            }
            const canonical = storedCommunityVote(voteSnapshot.id, vote.clubId, voteSnapshot.data());
            (0, participation_1.assertCanParticipate)(canonical.participationAudience, actor.role, 'vote');
            const now = firestore_1.Timestamp.fromDate(submittedAt);
            if (now.toMillis() < canonical.votingStartsAtMillis) {
                throw new handlers_1.HandlerError('failed-precondition', 'Voting has not started');
            }
            if (now.toMillis() >= canonical.votingEndsAtMillis) {
                throw new handlers_1.HandlerError('failed-precondition', 'Voting is closed');
            }
            if (canonical.kind === 'contest') {
                if (!canonical.options.some(({ id }) => id === optionId)) {
                    throw new handlers_1.HandlerError('invalid-argument', 'Choose a valid voting option');
                }
            }
            else {
                const nominee = await transaction.get(tenantCollection(vote.clubId, 'community-vote-nominees').doc(`${vote.id}__${optionId}`));
                if (!nominee.exists || nominee.data()?.voteId !== vote.id) {
                    throw new handlers_1.HandlerError('invalid-argument', 'Choose a valid presidential nominee');
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
const requestFor = (request) => ({
    authUid: request.auth?.uid,
    data: request.data,
});
const execute = async (operation) => {
    try {
        return await operation();
    }
    catch (error) {
        if (error instanceof handlers_1.HandlerError) {
            throw new https_1.HttpsError(error.code, error.message);
        }
        logger_1.logger.error('Callable workflow failed', error);
        throw new https_1.HttpsError('internal', 'The requested operation could not be completed');
    }
};
exports.submitCommunityBallot = (0, https_1.onCall)((request) => execute(() => (0, communityVoting_1.handleSubmitCommunityBallot)(requestFor(request), votingDependencies)));
exports.syncPublicProfile = (0, https_1.onCall)((request) => execute(() => (0, handlers_1.handleSyncPublicProfile)(requestFor(request), profileDependencies)));
//# sourceMappingURL=coreCallables.js.map