import { randomUUID } from 'node:crypto';

import { HandlerError, ManagedUser } from './handlers';

export type CommunityVoteKind = 'contest' | 'presidential_election';
export type NominationAction = 'nominate' | 'abstain';

export interface StoredCommunityVoteOption {
  readonly id: string;
  readonly label: string;
  readonly imageUrl?: string;
}

export interface StoredCommunityVote {
  readonly id: string;
  readonly clubId: string;
  readonly kind: CommunityVoteKind;
  readonly title?: string;
  readonly votingStartsAtMillis: number;
  readonly votingEndsAtMillis: number;
  readonly options: readonly StoredCommunityVoteOption[];
  readonly votingNotificationSentAtMillis?: number;
}

export interface NominationSubmission {
  readonly action: NominationAction;
  readonly candidateId?: string;
  readonly submittedAt: Date;
}

export interface BallotSubmission {
  readonly ballotId: string;
  readonly optionId: string;
  readonly submittedAt: Date;
}

export interface CommunityVoteResultOption extends StoredCommunityVoteOption {
  readonly votes: number;
}

export interface CommunityVoteResults {
  readonly totalVotes: number;
  readonly options: readonly CommunityVoteResultOption[];
}

export interface CommunityVotingDependencies {
  now(): Date;
  getUser(id: string): Promise<ManagedUser | undefined>;
  getVote(id: string, clubId: string): Promise<StoredCommunityVote | undefined>;
  submitNomination(input: {
    readonly actor: ManagedUser;
    readonly vote: StoredCommunityVote;
    readonly action: NominationAction;
    readonly submittedAt: Date;
  }): Promise<NominationSubmission>;
  submitBallot(input: {
    readonly actor: ManagedUser;
    readonly vote: StoredCommunityVote;
    readonly optionId: string;
    readonly ballotId: string;
    readonly submittedAt: Date;
  }): Promise<BallotSubmission>;
  getResults(vote: StoredCommunityVote): Promise<CommunityVoteResults>;
}

interface HandlerRequest<T> {
  readonly authUid?: string;
  readonly data: T;
}

interface NominationRequest {
  readonly voteId?: unknown;
  readonly action?: unknown;
}

interface BallotRequest {
  readonly voteId?: unknown;
  readonly optionId?: unknown;
}

interface ResultsRequest {
  readonly voteId?: unknown;
}

const parseVoteId = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 200 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new HandlerError('invalid-argument', 'Vote ID is invalid');
  }
  return value;
};

const requireActor = async (
  authUid: string | undefined,
  dependencies: CommunityVotingDependencies,
): Promise<ManagedUser> => {
  if (!authUid) {
    throw new HandlerError('unauthenticated', 'Sign in to participate in votes');
  }
  const actor = await dependencies.getUser(authUid);
  if (!actor || actor.banned) {
    throw new HandlerError(
      'permission-denied',
      'Your account cannot participate in votes',
    );
  }
  return actor;
};

const requireVote = async (
  voteId: string,
  clubId: string,
  dependencies: CommunityVotingDependencies,
): Promise<StoredCommunityVote> => {
  const vote = await dependencies.getVote(voteId, clubId);
  if (!vote) throw new HandlerError('not-found', 'Vote not found');
  return vote;
};

export async function handleSubmitCommunityNomination(
  request: HandlerRequest<NominationRequest>,
  dependencies: CommunityVotingDependencies,
) {
  const actor = await requireActor(request.authUid, dependencies);
  const voteId = parseVoteId(request.data.voteId);
  if (request.data.action !== 'nominate' && request.data.action !== 'abstain') {
    throw new HandlerError(
      'invalid-argument',
      'Choose whether to nominate yourself or abstain',
    );
  }
  const vote = await requireVote(voteId, actor.clubId, dependencies);
  if (vote.kind !== 'presidential_election') {
    throw new HandlerError(
      'failed-precondition',
      'This vote does not have a nomination round',
    );
  }
  const submittedAt = dependencies.now();
  if (submittedAt.getTime() >= vote.votingStartsAtMillis) {
    throw new HandlerError('failed-precondition', 'Nominations are closed');
  }
  const result = await dependencies.submitNomination({
    actor,
    vote,
    action: request.data.action,
    submittedAt,
  });
  return {
    action: result.action,
    ...(result.candidateId ? { candidateId: result.candidateId } : {}),
    submittedAtMillis: result.submittedAt.getTime(),
  };
}

export async function handleSubmitCommunityBallot(
  request: HandlerRequest<BallotRequest>,
  dependencies: CommunityVotingDependencies,
) {
  const actor = await requireActor(request.authUid, dependencies);
  const voteId = parseVoteId(request.data.voteId);
  if (
    typeof request.data.optionId !== 'string' ||
    !request.data.optionId ||
    request.data.optionId.length > 200
  ) {
    throw new HandlerError('invalid-argument', 'Choose a valid voting option');
  }
  const vote = await requireVote(voteId, actor.clubId, dependencies);
  const submittedAt = dependencies.now();
  if (submittedAt.getTime() < vote.votingStartsAtMillis) {
    throw new HandlerError('failed-precondition', 'Voting has not started');
  }
  if (submittedAt.getTime() >= vote.votingEndsAtMillis) {
    throw new HandlerError('failed-precondition', 'Voting is closed');
  }
  if (
    vote.kind === 'contest' &&
    !vote.options.some(({ id }) => id === request.data.optionId)
  ) {
    throw new HandlerError('invalid-argument', 'Choose a valid voting option');
  }
  const result = await dependencies.submitBallot({
    actor,
    vote,
    optionId: request.data.optionId,
    ballotId: randomUUID(),
    submittedAt,
  });
  return {
    ballotId: result.ballotId,
    optionId: result.optionId,
    submittedAtMillis: result.submittedAt.getTime(),
  };
}

export async function handleGetCommunityVoteResults(
  request: HandlerRequest<ResultsRequest>,
  dependencies: CommunityVotingDependencies,
): Promise<CommunityVoteResults> {
  const actor = await requireActor(request.authUid, dependencies);
  const vote = await requireVote(
    parseVoteId(request.data.voteId),
    actor.clubId,
    dependencies,
  );
  if (dependencies.now().getTime() < vote.votingEndsAtMillis) {
    throw new HandlerError(
      'failed-precondition',
      'Results are available after voting closes',
    );
  }
  return dependencies.getResults(vote);
}

export interface CommunityVoteStartNotificationDependencies {
  now(): Date;
  listElectionVotes(): Promise<readonly StoredCommunityVote[]>;
  sendNotification(notification: {
    readonly title: string;
    readonly body: string;
  }, clubId: string): Promise<void>;
  markNotificationSent(vote: StoredCommunityVote, sentAt: Date): Promise<void>;
}

export async function notifyStartedPresidentialVotes(
  dependencies: CommunityVoteStartNotificationDependencies,
): Promise<number> {
  const now = dependencies.now();
  const votes = await dependencies.listElectionVotes();
  const ready = votes.filter(
    (vote) =>
      vote.kind === 'presidential_election' &&
      vote.votingStartsAtMillis <= now.getTime() &&
      vote.votingEndsAtMillis > now.getTime() &&
      vote.votingNotificationSentAtMillis === undefined,
  );
  for (const vote of ready) {
    await dependencies.sendNotification(
      {
        title: 'Voting for club president has started',
        body: `Choose from the nominees before ${new Date(
          vote.votingEndsAtMillis,
        ).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'America/New_York',
        })}.`,
      },
      vote.clubId,
    );
    await dependencies.markNotificationSent(vote, now);
  }
  return ready.length;
}
