import { CommunityVote, User } from '../domain';

export type CommunityNominationAction = 'nominate' | 'abstain';

export interface CommunityNominationSubmission {
  readonly action: CommunityNominationAction;
  readonly candidateId?: string;
  readonly submittedAt: Date;
}

export interface CommunityBallotSubmission {
  readonly ballotId: string;
  readonly optionId: string;
  readonly submittedAt: Date;
}

export interface CommunityVoteResultOption {
  readonly id: string;
  readonly label: string;
  readonly imageUrl?: string;
  readonly votes: number;
}

export interface CommunityVoteResults {
  readonly totalVotes: number;
  readonly options: readonly CommunityVoteResultOption[];
}

export type CommunityVotingErrorCode = 'conflict' | 'validation';

export class CommunityVotingError extends Error {
  constructor(
    readonly code: CommunityVotingErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface CommunityVotingGateway {
  submitNomination(
    actor: User,
    vote: CommunityVote,
    action: CommunityNominationAction,
  ): Promise<CommunityNominationSubmission>;
  submitBallot(
    actor: User,
    vote: CommunityVote,
    optionId: string,
  ): Promise<CommunityBallotSubmission>;
  getResults(
    actor: User,
    vote: CommunityVote,
  ): Promise<CommunityVoteResults>;
}
