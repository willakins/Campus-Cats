import { Functions, httpsCallable } from 'firebase/functions';

import { CommunityVote, User } from '../../core/domain';
import {
  CommunityBallotSubmission,
  CommunityNominationAction,
  CommunityNominationSubmission,
  CommunityVoteResults,
  CommunityVotingError,
  CommunityVotingGateway,
} from '../../core/ports';

interface CallableNominationResult {
  readonly action: CommunityNominationAction;
  readonly candidateId?: string;
  readonly pitch?: string;
  readonly submittedAtMillis: number;
}

interface CallableBallotResult {
  readonly ballotId: string;
  readonly optionId: string;
  readonly submittedAtMillis: number;
}

export class FirebaseCommunityVotingGateway
  implements CommunityVotingGateway
{
  constructor(private readonly functions: Functions) {}

  async submitNomination(
    _actor: User,
    vote: CommunityVote,
    action: CommunityNominationAction,
    pitch?: string,
  ): Promise<CommunityNominationSubmission> {
    try {
      const normalizedPitch = pitch?.trim();
      const result = await httpsCallable<
        {
          readonly voteId: string;
          readonly action: CommunityNominationAction;
          readonly pitch?: string;
        },
        CallableNominationResult
      >(this.functions, 'submitCommunityNomination')({
        voteId: vote.id,
        action,
        ...(action === 'nominate' && normalizedPitch
          ? { pitch: normalizedPitch }
          : {}),
      });
      if (
        (result.data.action !== 'nominate' && result.data.action !== 'abstain') ||
        (result.data.candidateId !== undefined &&
          (typeof result.data.candidateId !== 'string' ||
            !result.data.candidateId)) ||
        (result.data.pitch !== undefined &&
          (typeof result.data.pitch !== 'string' ||
            !result.data.pitch.trim() ||
            result.data.pitch.length > 500)) ||
        (result.data.action === 'nominate' && !result.data.candidateId)
      ) {
        throw new Error('Community nomination returned an invalid receipt');
      }
      return {
        action: result.data.action,
        ...(result.data.candidateId
          ? { candidateId: result.data.candidateId }
          : {}),
        ...(result.data.pitch ? { pitch: result.data.pitch } : {}),
        submittedAt: validDate(result.data.submittedAtMillis),
      };
    } catch (error) {
      throw translateVotingError(error, 'Could not submit your nomination choice');
    }
  }

  async submitBallot(
    _actor: User,
    vote: CommunityVote,
    optionId: string,
  ): Promise<CommunityBallotSubmission> {
    try {
      const result = await httpsCallable<
        { readonly voteId: string; readonly optionId: string },
        CallableBallotResult
      >(this.functions, 'submitCommunityBallot')({
        voteId: vote.id,
        optionId,
      });
      if (
        typeof result.data.ballotId !== 'string' ||
        !result.data.ballotId ||
        typeof result.data.optionId !== 'string' ||
        !result.data.optionId
      ) {
        throw new Error('Community ballot returned an invalid receipt');
      }
      return {
        ballotId: result.data.ballotId,
        optionId: result.data.optionId,
        submittedAt: validDate(result.data.submittedAtMillis),
      };
    } catch (error) {
      throw translateVotingError(error, 'Could not submit your vote');
    }
  }

  async getResults(
    _actor: User,
    vote: CommunityVote,
  ): Promise<CommunityVoteResults> {
    try {
      const result = await httpsCallable<
        { readonly voteId: string },
        CommunityVoteResults
      >(this.functions, 'getCommunityVoteResults')({ voteId: vote.id });
      return validResults(result.data);
    } catch (error) {
      throw translateVotingError(error, 'Could not load voting results');
    }
  }
}

const validDate = (millis: number): Date => {
  const date = new Date(millis);
  if (!Number.isFinite(millis) || Number.isNaN(date.getTime())) {
    throw new Error('Community voting returned an invalid date');
  }
  return date;
};

const validResults = (value: CommunityVoteResults): CommunityVoteResults => {
  if (
    !Number.isInteger(value?.totalVotes) ||
    value.totalVotes < 0 ||
    !Array.isArray(value.options) ||
    value.options.some(
      (option) =>
        typeof option.id !== 'string' ||
        !option.id ||
        typeof option.label !== 'string' ||
        !option.label.trim() ||
        (option.imageUrl !== undefined && typeof option.imageUrl !== 'string') ||
        !Number.isInteger(option.votes) ||
        option.votes < 0,
    )
  ) {
    throw new Error('Community voting returned invalid results');
  }
  return value;
};

const translateVotingError = (error: unknown, fallback: string): Error => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : fallback;
  if (code.includes('already-exists') || code.includes('failed-precondition')) {
    return new CommunityVotingError('conflict', message);
  }
  if (code.includes('invalid-argument')) {
    return new CommunityVotingError('validation', message);
  }
  return error instanceof Error ? error : new Error(fallback);
};
