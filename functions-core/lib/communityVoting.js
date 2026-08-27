"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSubmitCommunityNomination = handleSubmitCommunityNomination;
exports.handleSubmitCommunityBallot = handleSubmitCommunityBallot;
exports.handleGetCommunityVoteResults = handleGetCommunityVoteResults;
exports.notifyStartedPresidentialVotes = notifyStartedPresidentialVotes;
const node_crypto_1 = require("node:crypto");
const handlers_1 = require("./handlers");
const participation_1 = require("./participation");
const parseVoteId = (value) => {
    if (typeof value !== 'string' ||
        !value ||
        value.length > 200 ||
        !/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new handlers_1.HandlerError('invalid-argument', 'Vote ID is invalid');
    }
    return value;
};
const requireActor = async (authUid, dependencies) => {
    if (!authUid) {
        throw new handlers_1.HandlerError('unauthenticated', 'Sign in to participate in votes');
    }
    const actor = await dependencies.getUser(authUid);
    if (!actor || actor.banned) {
        throw new handlers_1.HandlerError('permission-denied', 'Your account cannot participate in votes');
    }
    return actor;
};
const requireVote = async (voteId, clubId, dependencies) => {
    const vote = await dependencies.getVote(voteId, clubId);
    if (!vote)
        throw new handlers_1.HandlerError('not-found', 'Vote not found');
    return vote;
};
async function handleSubmitCommunityNomination(request, dependencies) {
    const actor = await requireActor(request.authUid, dependencies);
    const voteId = parseVoteId(request.data.voteId);
    if (request.data.action !== 'nominate' && request.data.action !== 'abstain') {
        throw new handlers_1.HandlerError('invalid-argument', 'Choose whether to nominate yourself or abstain');
    }
    if (request.data.pitch !== undefined &&
        (typeof request.data.pitch !== 'string' || request.data.pitch.length > 500)) {
        throw new handlers_1.HandlerError('invalid-argument', 'Nomination pitch must be 500 characters or fewer');
    }
    const pitch = typeof request.data.pitch === 'string'
        ? request.data.pitch.trim()
        : undefined;
    if (request.data.action === 'abstain' && pitch) {
        throw new handlers_1.HandlerError('invalid-argument', 'A pitch can only be included when nominating yourself');
    }
    const vote = await requireVote(voteId, actor.clubId, dependencies);
    (0, participation_1.assertCanParticipate)(vote.participationAudience, actor.role, 'vote');
    if (vote.kind !== 'presidential_election') {
        throw new handlers_1.HandlerError('failed-precondition', 'This vote does not have a nomination round');
    }
    const submittedAt = dependencies.now();
    if (submittedAt.getTime() >= vote.votingStartsAtMillis) {
        throw new handlers_1.HandlerError('failed-precondition', 'Nominations are closed');
    }
    const result = await dependencies.submitNomination({
        actor,
        vote,
        action: request.data.action,
        ...(pitch ? { pitch } : {}),
        submittedAt,
    });
    return {
        action: result.action,
        ...(result.candidateId ? { candidateId: result.candidateId } : {}),
        ...(result.pitch ? { pitch: result.pitch } : {}),
        submittedAtMillis: result.submittedAt.getTime(),
    };
}
async function handleSubmitCommunityBallot(request, dependencies) {
    const actor = await requireActor(request.authUid, dependencies);
    const voteId = parseVoteId(request.data.voteId);
    if (typeof request.data.optionId !== 'string' ||
        !request.data.optionId ||
        request.data.optionId.length > 200) {
        throw new handlers_1.HandlerError('invalid-argument', 'Choose a valid voting option');
    }
    const vote = await requireVote(voteId, actor.clubId, dependencies);
    (0, participation_1.assertCanParticipate)(vote.participationAudience, actor.role, 'vote');
    const submittedAt = dependencies.now();
    if (submittedAt.getTime() < vote.votingStartsAtMillis) {
        throw new handlers_1.HandlerError('failed-precondition', 'Voting has not started');
    }
    if (submittedAt.getTime() >= vote.votingEndsAtMillis) {
        throw new handlers_1.HandlerError('failed-precondition', 'Voting is closed');
    }
    if (vote.kind === 'contest' &&
        !vote.options.some(({ id }) => id === request.data.optionId)) {
        throw new handlers_1.HandlerError('invalid-argument', 'Choose a valid voting option');
    }
    const result = await dependencies.submitBallot({
        actor,
        vote,
        optionId: request.data.optionId,
        ballotId: (0, node_crypto_1.randomUUID)(),
        submittedAt,
    });
    return {
        ballotId: result.ballotId,
        optionId: result.optionId,
        submittedAtMillis: result.submittedAt.getTime(),
    };
}
async function handleGetCommunityVoteResults(request, dependencies) {
    const actor = await requireActor(request.authUid, dependencies);
    const vote = await requireVote(parseVoteId(request.data.voteId), actor.clubId, dependencies);
    if (dependencies.now().getTime() < vote.votingEndsAtMillis) {
        throw new handlers_1.HandlerError('failed-precondition', 'Results are available after voting closes');
    }
    return dependencies.getResults(vote);
}
async function notifyStartedPresidentialVotes(dependencies) {
    const now = dependencies.now();
    const votes = await dependencies.listElectionVotes();
    const ready = votes.filter((vote) => vote.kind === 'presidential_election' &&
        vote.votingStartsAtMillis <= now.getTime() &&
        vote.votingEndsAtMillis > now.getTime() &&
        vote.votingNotificationSentAtMillis === undefined);
    for (const vote of ready) {
        await dependencies.sendNotification({
            title: 'Voting for club president has started',
            body: `Choose from the nominees before ${new Date(vote.votingEndsAtMillis).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'America/New_York',
            })}.`,
        }, vote.clubId);
        await dependencies.markNotificationSent(vote, now);
    }
    return ready.length;
}
//# sourceMappingURL=communityVoting.js.map