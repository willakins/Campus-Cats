import { Role, parseCommunityVote, parseUser } from '../../core/domain';
import { communityVoteTimingLabel } from './communityVotePresentation';

const election = parseCommunityVote({
  id: 'election-1',
  kind: 'presidential_election',
  title: 'President election',
  details: '',
  options: [],
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'president-1',
    email: 'president@gatech.edu',
    role: Role.President,
  }),
  nominationEndsAt: new Date('2026-08-05T12:00:00.000Z'),
  votingStartsAt: new Date('2026-08-05T12:00:00.000Z'),
  votingEndsAt: new Date('2026-08-12T12:00:00.000Z'),
});

const format = (date: Date) => date.toISOString();

describe('community vote timing presentation', () => {
  it.each([
    [
      'nominations',
      'Nominations close 2026-08-05T12:00:00.000Z',
    ],
    ['voting', 'Voting closes 2026-08-12T12:00:00.000Z'],
    ['closed', 'Closed 2026-08-12T12:00:00.000Z'],
  ] as const)('shows only the timestamp relevant during %s', (phase, expected) => {
    expect(communityVoteTimingLabel(election, phase, format)).toBe(expected);
  });
});
