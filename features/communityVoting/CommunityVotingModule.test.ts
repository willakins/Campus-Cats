import { InMemoryCallableEffects } from '../../adapters/inMemory/InMemoryCallableEffects';
import { InMemoryDocumentStore } from '../../adapters/inMemory/InMemoryDocumentStore';
import { InMemoryMediaStore } from '../../adapters/inMemory/InMemoryMediaStore';
import {
  COLLECTIONS,
  CommunityVote,
  FixedClock,
  Role,
  SequenceIdGenerator,
  createPersistenceCodecs,
  dateObjectCodec,
  parseCommunityVote,
  parseCommunityVoteNominee,
  parseUser,
  communityVoteReceiptId,
} from '../../core/domain';
import { MediaCoordinator } from '../../core/media';
import {
  CommunityVotingError,
  CommunityVotingGateway,
} from '../../core/ports';
import {
  CommunityVoteDraft,
  CommunityVotingModule,
} from './CommunityVotingModule';

const now = new Date('2026-08-06T12:00:00.000Z');
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const officer = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});
const president = parseUser({
  id: 'president-1',
  email: 'president@gatech.edu',
  role: Role.President,
});
const developer = parseUser({
  id: 'developer-1',
  email: 'developer@gatech.edu',
  role: Role.Developer,
});

function buildModule({
  currentTime = now,
  gatewayOverrides = {},
}: {
  readonly currentTime?: Date;
  readonly gatewayOverrides?: Partial<CommunityVotingGateway>;
} = {}) {
  const documents = new InMemoryDocumentStore();
  const media = new InMemoryMediaStore();
  const effects = new InMemoryCallableEffects();
  const ids = new SequenceIdGenerator([
    'vote-1',
    'option-1',
    'option-2',
    'image-1',
    'image-2',
    'vote-2',
  ]);
  const gateway: CommunityVotingGateway = {
    async submitNomination(_actor, _vote, action) {
      return {
        action,
        ...(action === 'nominate' ? { candidateId: member.id } : {}),
        submittedAt: now,
      };
    },
    async submitBallot(_actor, _vote, optionId) {
      return { ballotId: 'ballot-1', optionId, submittedAt: now };
    },
    async getResults(_actor, vote) {
      return {
        totalVotes: 3,
        options: vote.options.map((option, index) => ({
          ...option,
          votes: index === 0 ? 2 : 1,
        })),
      };
    },
    ...gatewayOverrides,
  };
  const codecs = createPersistenceCodecs(dateObjectCodec);
  return {
    module: new CommunityVotingModule({
      documents,
      media,
      mediaCoordinator: new MediaCoordinator(media, ids),
      effects,
      gateway,
      ids,
      clock: new FixedClock(currentTime),
      codecs: {
        vote: codecs.communityVote,
        nominee: codecs.communityVoteNominee,
      },
    }),
    documents,
    effects,
    gateway,
    codecs,
    media,
  };
}

const contestDraft = {
  kind: 'contest' as const,
  title: 'Logo contest',
  details: '',
  votingDays: 7,
  options: [{ label: 'A' }, { label: 'B' }],
};

const electionDraft = {
  kind: 'presidential_election' as const,
  title: 'Club president election',
  details: '',
  nominationDays: 7,
  votingDays: 7,
};

const storedContest = (
  votingStartsAt = new Date('2026-08-01T12:00:00.000Z'),
  votingEndsAt = new Date('2026-08-10T12:00:00.000Z'),
) =>
  parseCommunityVote({
    id: 'stored-vote',
    kind: 'contest',
    title: 'Stored contest',
    details: '',
    options: [
      { id: 'stored-option-1', label: 'A' },
      { id: 'stored-option-2', label: 'B' },
    ],
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    createdBy: officer,
    votingStartsAt,
    votingEndsAt,
  });

const storedElection = (
  votingStartsAt = new Date('2026-08-10T12:00:00.000Z'),
  votingEndsAt = new Date('2026-08-17T12:00:00.000Z'),
) =>
  parseCommunityVote({
    id: 'stored-election',
    kind: 'presidential_election',
    title: 'Stored election',
    details: '',
    options: [],
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    createdBy: president,
    nominationEndsAt: votingStartsAt,
    votingStartsAt,
    votingEndsAt,
  });

const storeVote = async (
  built: ReturnType<typeof buildModule>,
  vote: CommunityVote,
) =>
  built.documents.put(
    COLLECTIONS.communityVotes,
    vote.id,
    built.codecs.communityVote.encode(vote),
  );

describe('CommunityVotingModule', () => {
  it('lets officers publish an image-backed contest and notifies members', async () => {
    const { module, effects } = buildModule();

    await expect(
      module.create(officer, {
        kind: 'contest',
        title: 'Choose our new club logo',
        details: 'Pick the design that should represent Campus Cats.',
        participationAudience: 'officers_only',
        votingDays: 7,
        options: [
          { label: 'Calico crest', imageLocalUri: 'file://calico.png' },
          { label: 'Midnight mark', imageLocalUri: 'file://midnight.png' },
        ],
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: 'vote-1',
        kind: 'contest',
        participationAudience: 'officers_only',
        votingStartsAt: now,
        votingEndsAt: new Date('2026-08-13T12:00:00.000Z'),
        options: [
          {
            id: 'option-1',
            imageUrl: 'memory://community-votes/vote-1/image-1.jpg',
          },
          {
            id: 'option-2',
            imageUrl: 'memory://community-votes/vote-1/image-2.jpg',
          },
        ],
      },
    });
    expect(effects.notifications[0]?.title).toBe(
      'Voting is open: Choose our new club logo',
    );
  });

  it('lets President-level roles start a timed presidential election', async () => {
    const { module } = buildModule();
    const draft = {
      kind: 'presidential_election' as const,
      title: '2026 club president election',
      details: 'Nominate yourself, then vote for the next president.',
      nominationDays: 14,
      votingDays: 7,
    };

    await expect(module.create(officer, draft)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(module.create(president, draft)).resolves.toMatchObject({
      ok: true,
      value: {
        kind: 'presidential_election',
        nominationEndsAt: new Date('2026-08-20T12:00:00.000Z'),
        votingStartsAt: new Date('2026-08-20T12:00:00.000Z'),
        votingEndsAt: new Date('2026-08-27T12:00:00.000Z'),
        options: [],
      },
    });
    await expect(
      buildModule().module.create(developer, draft),
    ).resolves.toMatchObject({
      ok: true,
      value: { kind: 'presidential_election' },
    });
  });

  it('allows only one presidential election to remain open at a time', async () => {
    const { module } = buildModule();

    await expect(module.create(president, electionDraft)).resolves.toMatchObject({
      ok: true,
    });
    await expect(module.create(president, electionDraft)).resolves.toEqual({
      ok: false,
      error: {
        code: 'conflict',
        message: 'A presidential election is already open',
      },
    });
  });

  it('enforces requested duration ranges and member creation access', async () => {
    const contest = {
      kind: 'contest' as const,
      title: 'Logo contest',
      details: '',
      votingDays: 15,
      options: [{ label: 'A' }, { label: 'B' }],
    };
    await expect(buildModule().module.create(member, contest)).resolves.toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    await expect(buildModule().module.create(officer, contest)).resolves.toEqual({
      ok: false,
      error: {
        code: 'validation',
        message: 'Voting must last from 1 to 14 days.',
      },
    });
    await expect(
      buildModule().module.create(president, {
        kind: 'presidential_election',
        title: 'Election',
        details: '',
        nominationDays: 32,
        votingDays: 7,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
  });

  it('lists valid votes while excluding malformed stored records', async () => {
    const { module, documents } = buildModule();
    await module.create(officer, {
      kind: 'contest',
      title: 'Logo contest',
      details: '',
      votingDays: 7,
      options: [{ label: 'A' }, { label: 'B' }],
    });
    await documents.put(COLLECTIONS.communityVotes, 'broken', {
      kind: 'contest',
      title: 'Broken',
    });

    await expect(module.list(member)).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'vote-1' }],
      warnings: [{ code: 'partial_completion' }],
    });
  });

  it('reports whether any currently open ballot still needs a vote', async () => {
    const built = buildModule();
    const contest = storedContest();

    await expect(
      built.module.hasUnsubmittedOpenBallot(member, [contest]),
    ).resolves.toMatchObject({ ok: true, value: true });

    await built.documents.put(
      COLLECTIONS.communityVoteBallotReceipts,
      communityVoteReceiptId(contest.id, member.id),
      { voteId: contest.id, userId: member.id },
    );
    await expect(
      built.module.hasUnsubmittedOpenBallot(member, [contest]),
    ).resolves.toMatchObject({ ok: true, value: false });

    await expect(
      built.module.hasUnsubmittedOpenBallot(member, [storedElection()]),
    ).resolves.toMatchObject({ ok: true, value: false });
  });

  it('enforces officer-only voting and excludes it from member attention', async () => {
    const built = buildModule();
    const contest = parseCommunityVote({
      ...storedContest(),
      participationAudience: 'officers_only',
    });
    await storeVote(built, contest);

    await expect(
      built.module.hasUnsubmittedOpenBallot(member, [contest]),
    ).resolves.toMatchObject({ ok: true, value: false });
    await expect(
      built.module.hasUnsubmittedOpenBallot(officer, [contest]),
    ).resolves.toMatchObject({ ok: true, value: true });
    await expect(
      built.module.submitBallot(member, contest.id, 'stored-option-1'),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Only officers can participate in this vote',
      },
    });
    await expect(
      built.module.submitBallot(officer, contest.id, 'stored-option-1'),
    ).resolves.toMatchObject({ ok: true });

    const electionBuild = buildModule();
    const election = parseCommunityVote({
      ...storedElection(),
      participationAudience: 'officers_only',
    });
    await storeVote(electionBuild, election);
    await expect(
      electionBuild.module.submitNomination(member, election.id, 'abstain'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'forbidden' } });
    await expect(
      electionBuild.module.submitNomination(officer, election.id, 'abstain'),
    ).resolves.toMatchObject({ ok: true });
  });

  it('requires authentication and maps vote document failures', async () => {
    const built = buildModule();
    await expect(built.module.list(undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(built.module.get(undefined, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });
    await expect(built.module.get(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });

    built.documents.failNext('list', new Error('offline'));
    await expect(built.module.list(member)).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    built.documents.failNext('get', new Error('offline'));
    await expect(built.module.get(member, 'missing')).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it.each<readonly [CommunityVoteDraft, string]>([
    [{ ...contestDraft, title: ' ' }, 'Vote title cannot be empty.'],
    [
      { ...contestDraft, title: 'x'.repeat(121) },
      'Vote title must be 120 characters or fewer.',
    ],
    [
      { ...contestDraft, details: 'x'.repeat(5001) },
      'Vote details must be 5,000 characters or fewer.',
    ],
    [
      { ...contestDraft, votingDays: 1.5 },
      'Voting must last from 1 to 14 days.',
    ],
    [
      { ...contestDraft, votingDays: 0 },
      'Voting must last from 1 to 14 days.',
    ],
    [
      { ...electionDraft, nominationDays: 1.5 },
      'Nominations must last from 1 to 31 days.',
    ],
    [
      { ...electionDraft, nominationDays: 0 },
      'Nominations must last from 1 to 31 days.',
    ],
    [
      { ...contestDraft, options: [{ label: 'Only one' }] },
      'Add at least two contest options.',
    ],
    [
      {
        ...contestDraft,
        options: Array.from({ length: 21 }, (_, index) => ({
          label: `Option ${index}`,
        })),
      },
      'Contests may have up to 20 options.',
    ],
    [
      { ...contestDraft, options: [{ label: '' }, { label: 'B' }] },
      'Every contest option needs a label.',
    ],
    [
      {
        ...contestDraft,
        options: [{ label: 'x'.repeat(121) }, { label: 'B' }],
      },
      'Contest option labels must be 120 characters or fewer.',
    ],
    [
      { ...contestDraft, options: [{ label: 'Same' }, { label: 'same' }] },
      'Contest option labels must be unique.',
    ],
  ])('rejects invalid voting draft', async (draft, message) => {
    const actor = draft.kind === 'presidential_election' ? president : officer;
    await expect(buildModule().module.create(actor, draft)).resolves.toEqual({
      ok: false,
      error: { code: 'validation', message },
    });
  });

  it('maps create persistence, media, and notification failures without losing saved votes', async () => {
    await expect(
      buildModule().module.create(undefined, contestDraft),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'unauthenticated' },
    });

    const electionFailure = buildModule();
    electionFailure.documents.failNext('commit', new Error('offline'));
    await expect(
      electionFailure.module.create(president, electionDraft),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const mediaFailure = buildModule();
    mediaFailure.media.failNext('list', new Error('offline'));
    await expect(
      mediaFailure.module.create(officer, contestDraft),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const persistFailure = buildModule();
    persistFailure.documents.failNext('put', new Error('offline'));
    await expect(
      persistFailure.module.create(officer, contestDraft),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const notificationFailure = buildModule();
    notificationFailure.effects.failNext(
      'notifyAnnouncement',
      new Error('provider unavailable'),
    );
    await expect(
      notificationFailure.module.create(president, electionDraft),
    ).resolves.toMatchObject({
      ok: true,
      warnings: [{ code: 'notification_failed' }],
    });
    expect(
      await notificationFailure.documents.get(
        COLLECTIONS.communityVotes,
        'vote-1',
      ),
    ).toBeDefined();
  });

  it('loads sorted nominees, excludes malformed records, and maps them into election choices', async () => {
    const built = buildModule();
    const nominees = [
      parseCommunityVoteNominee({
        voteId: 'stored-election',
        userId: 'member-2',
        displayName: 'Zoe',
        nominatedAt: now,
      }),
      parseCommunityVoteNominee({
        voteId: 'stored-election',
        userId: 'member-1',
        displayName: 'Alex',
        pitch: 'I will coordinate reliable volunteer coverage.',
        nominatedAt: now,
      }),
    ];
    for (const nominee of nominees) {
      await built.documents.put(
        COLLECTIONS.communityVoteNominees,
        `${nominee.voteId}__${nominee.userId}`,
        built.codecs.communityVoteNominee.encode(nominee),
      );
    }
    await built.documents.put(COLLECTIONS.communityVoteNominees, 'broken', {
      voteId: 'stored-election',
      displayName: '',
    });

    await expect(
      built.module.nominees(member, 'stored-election'),
    ).resolves.toMatchObject({
      ok: true,
      value: [{ displayName: 'Alex' }, { displayName: 'Zoe' }],
      warnings: [{ code: 'partial_completion' }],
    });
    await expect(
      built.module.choices(member, storedElection()),
    ).resolves.toMatchObject({
      ok: true,
      value: [
        {
          id: 'member-1',
          label: 'Alex',
          pitch: 'I will coordinate reliable volunteer coverage.',
          profileUserId: 'member-1',
        },
        { id: 'member-2', label: 'Zoe', profileUserId: 'member-2' },
      ],
    });
    await expect(
      built.module.choices(member, storedContest()),
    ).resolves.toMatchObject({
      ok: true,
      value: [{ id: 'stored-option-1' }, { id: 'stored-option-2' }],
    });
    await expect(
      built.module.nominees(undefined, 'stored-election'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });

    const failed = buildModule();
    failed.documents.failNext('listWhereEqual', new Error('offline'));
    await expect(
      failed.module.choices(member, storedElection()),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });

  it('enforces one nomination response within the election nomination phase', async () => {
    const built = buildModule();
    const election = storedElection();
    await storeVote(built, election);
    const submitNomination = jest.spyOn(
      built.gateway,
      'submitNomination',
    );

    await expect(
      built.module.submitNomination(
        member,
        election.id,
        'nominate',
        '  I will improve volunteer coordination.  ',
      ),
    ).resolves.toMatchObject({
      ok: true,
      value: { action: 'nominate', candidateId: member.id },
    });
    expect(submitNomination).toHaveBeenCalledWith(
      member,
      election,
      'nominate',
      'I will improve volunteer coordination.',
    );
    await expect(
      built.module.submitNomination(
        member,
        election.id,
        'nominate',
        'x'.repeat(501),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    await expect(
      built.module.submitNomination(undefined, election.id, 'nominate'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      built.module.submitNomination(member, 'missing', 'nominate'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });

    await built.documents.put(
      COLLECTIONS.communityVoteNominationReceipts,
      `${member.id}__${election.id}`,
      { voteId: election.id },
    );
    await expect(
      built.module.submitNomination(member, election.id, 'abstain'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });

    const contest = buildModule();
    await storeVote(contest, storedContest());
    await expect(
      contest.module.submitNomination(member, 'stored-vote', 'nominate'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });

    const closed = buildModule({
      currentTime: new Date('2026-08-11T12:00:00.000Z'),
    });
    await storeVote(closed, election);
    await expect(
      closed.module.submitNomination(member, election.id, 'nominate'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });
  });

  it('maps nomination receipt and gateway failures', async () => {
    const receiptFailure = buildModule();
    const election = storedElection();
    await storeVote(receiptFailure, election);
    const originalGet = receiptFailure.documents.get.bind(
      receiptFailure.documents,
    );
    const get = jest
      .spyOn(receiptFailure.documents, 'get')
      .mockImplementationOnce(originalGet)
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      receiptFailure.module.submitNomination(member, election.id, 'nominate'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    get.mockRestore();

    for (const error of [
      new CommunityVotingError('conflict', 'Already submitted'),
      new Error('offline'),
    ]) {
      const failed = buildModule({
        gatewayOverrides: {
          submitNomination: jest.fn().mockRejectedValue(error),
        },
      });
      await storeVote(failed, election);
      await expect(
        failed.module.submitNomination(member, election.id, 'abstain'),
      ).resolves.toMatchObject({
        ok: false,
        error: {
          code:
            error instanceof CommunityVotingError
              ? 'conflict'
              : 'dependency_failure',
        },
      });
    }
  });

  it('enforces one valid private ballot during the voting phase', async () => {
    const built = buildModule();
    const contest = storedContest();
    await storeVote(built, contest);

    await expect(
      built.module.submitBallot(member, contest.id, 'stored-option-1'),
    ).resolves.toEqual({ ok: true, value: undefined, warnings: [] });
    await expect(
      built.module.submitBallot(undefined, contest.id, 'stored-option-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      built.module.submitBallot(member, 'missing', 'stored-option-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });
    await expect(
      built.module.submitBallot(member, contest.id, 'unknown'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });

    await built.documents.put(
      COLLECTIONS.communityVoteBallotReceipts,
      `${member.id}__${contest.id}`,
      { voteId: contest.id },
    );
    await expect(
      built.module.submitBallot(member, contest.id, 'stored-option-2'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });

    const before = buildModule({
      currentTime: new Date('2026-07-31T12:00:00.000Z'),
    });
    await storeVote(before, contest);
    await expect(
      before.module.submitBallot(member, contest.id, 'stored-option-1'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });
  });

  it('maps ballot choice, receipt, and gateway failures', async () => {
    const election = storedElection(
      new Date('2026-08-01T12:00:00.000Z'),
      new Date('2026-08-10T12:00:00.000Z'),
    );
    const choiceFailure = buildModule();
    await storeVote(choiceFailure, election);
    choiceFailure.documents.failNext('listWhereEqual', new Error('offline'));
    await expect(
      choiceFailure.module.submitBallot(member, election.id, member.id),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });

    const receiptFailure = buildModule();
    const contest = storedContest();
    await storeVote(receiptFailure, contest);
    const originalGet = receiptFailure.documents.get.bind(
      receiptFailure.documents,
    );
    const get = jest
      .spyOn(receiptFailure.documents, 'get')
      .mockImplementationOnce(originalGet)
      .mockRejectedValueOnce(new Error('offline'));
    await expect(
      receiptFailure.module.submitBallot(
        member,
        contest.id,
        'stored-option-1',
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
    get.mockRestore();

    for (const error of [
      new CommunityVotingError('validation', 'Invalid candidate'),
      new Error('offline'),
    ]) {
      const failed = buildModule({
        gatewayOverrides: {
          submitBallot: jest.fn().mockRejectedValue(error),
        },
      });
      await storeVote(failed, contest);
      await expect(
        failed.module.submitBallot(member, contest.id, 'stored-option-1'),
      ).resolves.toMatchObject({
        ok: false,
        error: {
          code:
            error instanceof CommunityVotingError
              ? 'validation'
              : 'dependency_failure',
        },
      });
    }
  });

  it('reveals final results only after close and maps result failures', async () => {
    await expect(
      buildModule().module.results(undefined, 'missing'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    await expect(
      buildModule().module.results(member, 'missing'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'not_found' } });

    const open = buildModule();
    await storeVote(open, storedContest());
    await expect(
      open.module.results(member, 'stored-vote'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });

    const closedVote = storedContest(
      new Date('2026-07-20T12:00:00.000Z'),
      new Date('2026-08-05T12:00:00.000Z'),
    );
    const closed = buildModule();
    await storeVote(closed, closedVote);
    await expect(
      closed.module.results(member, closedVote.id),
    ).resolves.toMatchObject({ ok: true, value: { totalVotes: 3 } });

    for (const error of [
      new CommunityVotingError('conflict', 'Results unavailable'),
      new Error('offline'),
    ]) {
      const failed = buildModule({
        gatewayOverrides: { getResults: jest.fn().mockRejectedValue(error) },
      });
      await storeVote(failed, closedVote);
      await expect(
        failed.module.results(member, closedVote.id),
      ).resolves.toMatchObject({
        ok: false,
        error: {
          code:
            error instanceof CommunityVotingError
              ? 'conflict'
              : 'dependency_failure',
        },
      });
    }
  });

  it('reports direct receipt checks for missing, present, unauthenticated, and failed reads', async () => {
    const built = buildModule();
    await expect(
      built.module.hasSubmittedBallot(member, 'stored-vote'),
    ).resolves.toEqual({ ok: true, value: false, warnings: [] });
    await built.documents.put(
      COLLECTIONS.communityVoteBallotReceipts,
      `${member.id}__stored-vote`,
      { voteId: 'stored-vote' },
    );
    await expect(
      built.module.hasSubmittedBallot(member, 'stored-vote'),
    ).resolves.toEqual({ ok: true, value: true, warnings: [] });
    await expect(
      built.module.hasSubmittedNomination(undefined, 'stored-election'),
    ).resolves.toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    built.documents.failNext('get', new Error('offline'));
    await expect(
      built.module.hasSubmittedNomination(member, 'stored-election'),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'dependency_failure' },
    });
  });
});
