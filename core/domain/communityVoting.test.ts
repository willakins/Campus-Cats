import {
  Role,
  communityVotePhase,
  communityVoteReceiptId,
  parseCommunityVote,
  parseCommunityVoteNominee,
  parseUser,
} from './index';

const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});
const startsAt = new Date('2026-08-06T12:00:00.000Z');
const endsAt = new Date('2026-08-13T12:00:00.000Z');

const contest = () => ({
  id: 'vote-1',
  kind: 'contest' as const,
  title: 'Logo contest',
  details: '',
  options: [
    {
      id: 'option-1',
      label: 'Calico crest',
      imageUrl: 'https://example.com/calico.jpg',
    },
    { id: 'option-2', label: 'Midnight mark' },
  ],
  createdAt: startsAt,
  createdBy: officer,
  votingStartsAt: startsAt,
  votingEndsAt: endsAt,
  votingNotificationSentAt: startsAt,
});

describe('community voting domain', () => {
  it('parses and deeply freezes contest and nominee records', () => {
    const vote = parseCommunityVote(contest());
    const nominee = parseCommunityVoteNominee({
      voteId: vote.id,
      userId: 'member-1',
      displayName: 'Alex',
      pitch: '  I will publish clear feeding-station plans.  ',
      nominatedAt: startsAt,
    });

    expect(Object.isFrozen(vote)).toBe(true);
    expect(Object.isFrozen(vote.options)).toBe(true);
    expect(Object.isFrozen(vote.options[0])).toBe(true);
    expect(Object.isFrozen(nominee)).toBe(true);
    expect(vote.participationAudience).toBe('all_members');
    expect(nominee.pitch).toBe(
      'I will publish clear feeding-station plans.',
    );
    expect(() =>
      parseCommunityVoteNominee({
        voteId: vote.id,
        userId: 'member-1',
        displayName: '',
        nominatedAt: startsAt,
      }),
    ).toThrow();
    expect(() =>
      parseCommunityVoteNominee({
        voteId: vote.id,
        userId: 'member-1',
        displayName: 'Alex',
        pitch: 'x'.repeat(501),
        nominatedAt: startsAt,
      }),
    ).toThrow();
  });

  it('retains an explicit officer-only participation audience', () => {
    expect(
      parseCommunityVote({
        ...contest(),
        participationAudience: 'officers_only',
      }).participationAudience,
    ).toBe('officers_only');
  });

  it.each([
    {
      ...contest(),
      votingEndsAt: startsAt,
    },
    {
      ...contest(),
      options: [
        { id: 'same', label: 'A' },
        { id: 'same', label: 'B' },
      ],
    },
    {
      ...contest(),
      options: [{ id: 'option-1', label: 'Only one' }],
    },
    {
      ...contest(),
      nominationEndsAt: startsAt,
    },
  ])('rejects invalid contest invariants', (value) => {
    expect(() => parseCommunityVote(value)).toThrow();
  });

  it('requires presidential nominees to come from an aligned nomination round', () => {
    const election = {
      ...contest(),
      kind: 'presidential_election' as const,
      options: [],
      nominationEndsAt: startsAt,
      votingNotificationSentAt: undefined,
    };
    expect(parseCommunityVote(election).kind).toBe('presidential_election');
    expect(() =>
      parseCommunityVote({
        ...election,
        options: [{ id: 'candidate-1', label: 'Injected candidate' }],
      }),
    ).toThrow();
    expect(() =>
      parseCommunityVote({ ...election, nominationEndsAt: undefined }),
    ).toThrow();
    expect(() =>
      parseCommunityVote({
        ...election,
        nominationEndsAt: new Date('2026-08-07T12:00:00.000Z'),
      }),
    ).toThrow();
  });

  it('derives each timestamp phase and deterministic private receipt ID', () => {
    const vote = parseCommunityVote(contest());
    expect(
      communityVotePhase(vote, new Date('2026-08-05T12:00:00.000Z')),
    ).toBe('nominations');
    expect(communityVotePhase(vote, startsAt)).toBe('voting');
    expect(communityVotePhase(vote, endsAt)).toBe('closed');
    expect(communityVoteReceiptId(vote.id, 'member-1')).toBe(
      'member-1__vote-1',
    );
  });
});
