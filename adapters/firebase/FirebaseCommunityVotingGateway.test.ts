import { Functions } from 'firebase/functions';

import { Role, parseCommunityVote, parseUser } from '../../core/domain';
import { FirebaseCommunityVotingGateway } from './FirebaseCommunityVotingGateway';

const mockCallable = jest.fn();

jest.mock('firebase/functions', () => ({
  httpsCallable: (_functions: unknown, name: string) => (data: unknown) =>
    mockCallable(name, data),
}));

const actor = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const vote = parseCommunityVote({
  id: 'vote-1',
  kind: 'contest',
  title: 'Logo contest',
  details: '',
  options: [
    { id: 'option-1', label: 'A' },
    { id: 'option-2', label: 'B' },
  ],
  createdAt: new Date('2026-08-06T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'officer-1',
    email: 'officer@gatech.edu',
    role: Role.Officer,
  }),
  votingStartsAt: new Date('2026-08-06T12:00:00.000Z'),
  votingEndsAt: new Date('2026-08-13T12:00:00.000Z'),
});

describe('FirebaseCommunityVotingGateway', () => {
  beforeEach(() => mockCallable.mockReset());

  it('submits nomination and ballot choices to trusted callables', async () => {
    const gateway = new FirebaseCommunityVotingGateway({} as Functions);
    mockCallable.mockResolvedValueOnce({
      data: {
        action: 'nominate',
        candidateId: actor.id,
        submittedAtMillis: 1786017600000,
      },
    });
    await expect(
      gateway.submitNomination(actor, vote, 'nominate'),
    ).resolves.toEqual({
      action: 'nominate',
      candidateId: actor.id,
      submittedAt: new Date(1786017600000),
    });
    expect(mockCallable).toHaveBeenLastCalledWith(
      'submitCommunityNomination',
      { voteId: vote.id, action: 'nominate' },
    );

    mockCallable.mockResolvedValueOnce({
      data: {
        ballotId: 'ballot-1',
        optionId: 'option-2',
        submittedAtMillis: 1786017600000,
      },
    });
    await expect(
      gateway.submitBallot(actor, vote, 'option-2'),
    ).resolves.toEqual({
      ballotId: 'ballot-1',
      optionId: 'option-2',
      submittedAt: new Date(1786017600000),
    });
    expect(mockCallable).toHaveBeenLastCalledWith('submitCommunityBallot', {
      voteId: vote.id,
      optionId: 'option-2',
    });
  });

  it('loads validated aggregate results', async () => {
    const gateway = new FirebaseCommunityVotingGateway({} as Functions);
    const results = {
      totalVotes: 2,
      options: [
        { id: 'option-1', label: 'A', votes: 2 },
        { id: 'option-2', label: 'B', votes: 0 },
      ],
    };
    mockCallable.mockResolvedValue({ data: results });

    await expect(gateway.getResults(actor, vote)).resolves.toEqual(results);
    expect(mockCallable).toHaveBeenCalledWith('getCommunityVoteResults', {
      voteId: vote.id,
    });
  });

  it.each([
    ['submitNomination', { action: 'nominate', submittedAtMillis: 1 }],
    [
      'submitBallot',
      { ballotId: '', optionId: 'option-1', submittedAtMillis: 1 },
    ],
    ['getResults', { totalVotes: -1, options: [] }],
  ] as const)('rejects malformed %s responses', async (method, data) => {
    const gateway = new FirebaseCommunityVotingGateway({} as Functions);
    mockCallable.mockResolvedValue({ data });
    const operation =
      method === 'submitNomination'
        ? gateway.submitNomination(actor, vote, 'nominate')
        : method === 'submitBallot'
          ? gateway.submitBallot(actor, vote, 'option-1')
          : gateway.getResults(actor, vote);
    await expect(operation).rejects.toThrow();
  });

  it.each([
    ['functions/already-exists', 'conflict'],
    ['failed-precondition', 'conflict'],
    ['invalid-argument', 'validation'],
  ])('preserves callable %s errors as %s', async (code, expectedCode) => {
    mockCallable.mockRejectedValue({ code, message: 'Cannot participate' });
    const gateway = new FirebaseCommunityVotingGateway({} as Functions);

    await expect(
      gateway.submitBallot(actor, vote, 'option-1'),
    ).rejects.toMatchObject({ code: expectedCode, message: 'Cannot participate' });
  });

  it('uses fallback copy and preserves unknown dependency failures', async () => {
    const gateway = new FirebaseCommunityVotingGateway({} as Functions);
    mockCallable.mockRejectedValueOnce({ code: 'invalid-argument' });
    await expect(
      gateway.submitNomination(actor, vote, 'abstain'),
    ).rejects.toMatchObject({
      code: 'validation',
      message: 'Could not submit your nomination choice',
    });

    const offline = new Error('offline');
    mockCallable.mockRejectedValueOnce(offline);
    await expect(gateway.getResults(actor, vote)).rejects.toBe(offline);
  });
});
