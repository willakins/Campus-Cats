import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HandlerError, ManagedUser } from './handlers';
import {
  CommunityVotingDependencies,
  handleGetCommunityVoteResults,
  handleSubmitCommunityBallot,
  handleSubmitCommunityNomination,
  notifyStartedPresidentialVotes,
} from './communityVoting';

const member: ManagedUser = {
  id: 'member-1',
  email: 'member@gatech.edu',
  role: 0,
  banned: false,
};

const election = {
  id: 'election-1',
  kind: 'presidential_election' as const,
  votingStartsAtMillis: Date.parse('2026-08-10T12:00:00.000Z'),
  votingEndsAtMillis: Date.parse('2026-08-17T12:00:00.000Z'),
  options: [],
};

function dependencies(
  now = new Date('2026-08-07T12:00:00.000Z'),
): CommunityVotingDependencies {
  return {
    now: () => now,
    async getUser() {
      return member;
    },
    async getVote() {
      return election;
    },
    async submitNomination({ actor, action, submittedAt }) {
      return { action, candidateId: action === 'nominate' ? actor.id : undefined, submittedAt };
    },
    async submitBallot() {
      throw new Error('not used');
    },
    async getResults() {
      throw new Error('not used');
    },
  };
}

describe('community voting callable', () => {
  it('lets an active member self-nominate during the presidential nomination round', async () => {
    const result = await handleSubmitCommunityNomination(
      {
        authUid: member.id,
        data: { voteId: election.id, action: 'nominate' },
      },
      dependencies(),
    );

    assert.deepEqual(result, {
      action: 'nominate',
      candidateId: member.id,
      submittedAtMillis: Date.parse('2026-08-07T12:00:00.000Z'),
    });
  });

  it('rejects nominations after voting has begun', async () => {
    await assert.rejects(
      () =>
        handleSubmitCommunityNomination(
          {
            authUid: member.id,
            data: { voteId: election.id, action: 'abstain' },
          },
          dependencies(new Date('2026-08-10T12:00:00.000Z')),
        ),
      (error: unknown) =>
        error instanceof HandlerError && error.code === 'failed-precondition',
    );
  });

  it('accepts one canonical ballot only during the voting round', async () => {
    const contest = {
      ...election,
      id: 'contest-1',
      kind: 'contest' as const,
      votingStartsAtMillis: Date.parse('2026-08-06T12:00:00.000Z'),
      options: [
        { id: 'option-a', label: 'A' },
        { id: 'option-b', label: 'B' },
      ],
    };
    const submitted: unknown[] = [];
    const deps: CommunityVotingDependencies = {
      ...dependencies(new Date('2026-08-07T12:00:00.000Z')),
      async getVote() {
        return contest;
      },
      async submitBallot(input) {
        submitted.push(input);
        return {
          ballotId: input.ballotId,
          optionId: input.optionId,
          submittedAt: input.submittedAt,
        };
      },
    };

    const result = await handleSubmitCommunityBallot(
      {
        authUid: member.id,
        data: { voteId: contest.id, optionId: 'option-b' },
      },
      deps,
    );

    assert.equal(result.optionId, 'option-b');
    assert.equal(typeof result.ballotId, 'string');
    assert.equal(submitted.length, 1);
    await assert.rejects(
      () =>
        handleSubmitCommunityBallot(
          {
            authUid: member.id,
            data: { voteId: contest.id, optionId: 'unknown' },
          },
          deps,
        ),
      (error: unknown) =>
        error instanceof HandlerError && error.code === 'invalid-argument',
    );
  });

  it('reveals aggregate results only after voting closes', async () => {
    const closed = {
      ...election,
      votingEndsAtMillis: Date.parse('2026-08-12T12:00:00.000Z'),
    };
    const deps: CommunityVotingDependencies = {
      ...dependencies(new Date('2026-08-13T12:00:00.000Z')),
      async getVote() {
        return closed;
      },
      async getResults() {
        return {
          totalVotes: 2,
          options: [{ id: member.id, label: 'Member', votes: 2 }],
        };
      },
    };

    await assert.doesNotReject(async () => {
      assert.deepEqual(
        await handleGetCommunityVoteResults(
          { authUid: member.id, data: { voteId: closed.id } },
          deps,
        ),
        {
          totalVotes: 2,
          options: [{ id: member.id, label: 'Member', votes: 2 }],
        },
      );
    });
    await assert.rejects(
      () =>
        handleGetCommunityVoteResults(
          { authUid: member.id, data: { voteId: election.id } },
          dependencies(new Date('2026-08-11T12:00:00.000Z')),
        ),
      (error: unknown) =>
        error instanceof HandlerError && error.code === 'failed-precondition',
    );
  });

  it('announces each newly started presidential ballot once', async () => {
    const notifications: unknown[] = [];
    const marked: string[] = [];
    const sent = await notifyStartedPresidentialVotes({
      now: () => new Date('2026-08-11T12:00:00.000Z'),
      async listElectionVotes() {
        return [
          election,
          { ...election, id: 'already-sent', votingNotificationSentAtMillis: 1 },
          {
            ...election,
            id: 'not-started',
            votingStartsAtMillis: Date.parse('2026-08-12T12:00:00.000Z'),
          },
        ];
      },
      async sendNotification(notification) {
        notifications.push(notification);
      },
      async markNotificationSent(voteId) {
        marked.push(voteId);
      },
    });

    assert.equal(sent, 1);
    assert.deepEqual(marked, [election.id]);
    assert.deepEqual(notifications, [
      {
        title: 'Voting for club president has started',
        body: 'Choose from the nominees before Aug 17, 2026.',
      },
    ]);
  });
});
