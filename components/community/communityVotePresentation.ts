import { CommunityVote, CommunityVotePhase } from '../../core/domain';

export const communityVoteTimingLabel = (
  vote: CommunityVote,
  phase: CommunityVotePhase,
  formatDate: (date: Date) => string,
): string => {
  if (phase === 'nominations') {
    return `Nominations close ${formatDate(vote.votingStartsAt)}`;
  }
  if (phase === 'voting') {
    return `Voting closes ${formatDate(vote.votingEndsAt)}`;
  }
  return `Closed ${formatDate(vote.votingEndsAt)}`;
};
