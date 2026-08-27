import {
  COLLECTIONS,
  Clock,
  CommunityVote,
  CommunityVoteNominee,
  IdGenerator,
  Outcome,
  ParticipationAudience,
  PersistenceCodec,
  User,
  canAccessRolePolicy,
  canParticipate,
  communityVotePhase,
  communityVoteReceiptId,
  failure,
  parseCommunityVote,
  success,
  roleAccessPolicies,
  roleAccessRequirement,
} from '../../core/domain';
import { MediaCoordinator, localMedia } from '../../core/media';
import {
  ApplicationEffects,
  CommunityNominationAction,
  CommunityNominationSubmission,
  CommunityVoteResults,
  CommunityVotingError,
  CommunityVotingGateway,
  DocumentStore,
  MediaStore,
} from '../../core/ports';

export interface ContestOptionDraft {
  readonly label: string;
  readonly imageLocalUri?: string;
}

export interface ContestDraft {
  readonly kind: 'contest';
  readonly title: string;
  readonly details: string;
  readonly participationAudience?: ParticipationAudience;
  readonly votingDays: number;
  readonly options: readonly ContestOptionDraft[];
}

export interface PresidentialElectionDraft {
  readonly kind: 'presidential_election';
  readonly title: string;
  readonly details: string;
  readonly participationAudience?: ParticipationAudience;
  readonly nominationDays: number;
  readonly votingDays: number;
}

export type CommunityVoteDraft = ContestDraft | PresidentialElectionDraft;

const ACTIVE_PRESIDENTIAL_ELECTION_ID = 'presidential-election';

export interface CommunityVotingChoice {
  readonly id: string;
  readonly label: string;
  readonly imageUrl?: string;
  readonly pitch?: string;
  readonly profileUserId?: string;
}

interface CommunityVotingDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly effects: ApplicationEffects;
  readonly gateway: CommunityVotingGateway;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codecs: {
    readonly vote: PersistenceCodec<CommunityVote>;
    readonly nominee: PersistenceCodec<CommunityVoteNominee>;
  };
}

export class CommunityVotingModule {
  constructor(private readonly dependencies: CommunityVotingDependencies) {}

  async list(actor: User | undefined): Promise<Outcome<readonly CommunityVote[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view votes');
    try {
      const documents = await this.dependencies.documents.list(
        COLLECTIONS.communityVotes,
      );
      let invalidCount = 0;
      const votes = documents
        .flatMap(({ id, data }) => {
          try {
            return [this.dependencies.codecs.vote.decode(id, data)];
          } catch {
            invalidCount += 1;
            return [];
          }
        })
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        );
      return success(
        votes,
        invalidCount
          ? [
              {
                code: 'partial_completion',
                message: `${invalidCount} invalid ${
                  invalidCount === 1 ? 'vote was' : 'votes were'
                } excluded.`,
              },
            ]
          : [],
      );
    } catch {
      return failure('dependency_failure', 'Could not load community votes');
    }
  }

  async get(
    actor: User | undefined,
    id: string,
  ): Promise<Outcome<CommunityVote>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view votes');
    try {
      const document = await this.dependencies.documents.get(
        COLLECTIONS.communityVotes,
        id,
      );
      return document
        ? success(this.dependencies.codecs.vote.decode(document.id, document.data))
        : failure('not_found', 'Vote not found');
    } catch {
      return failure('dependency_failure', 'Could not load the vote');
    }
  }

  async create(
    actor: User | undefined,
    draft: CommunityVoteDraft,
  ): Promise<Outcome<CommunityVote>> {
    if (!actor) return failure('unauthenticated', 'Sign in to create votes');
    const denied = creationDenied(actor, draft.kind);
    if (denied) return denied;
    const validation = validateDraft(draft);
    if (validation) return failure('validation', validation);

    if (draft.kind === 'presidential_election') {
      try {
        const state = await this.dependencies.documents.get(
          COLLECTIONS.communityVoteState,
          ACTIVE_PRESIDENTIAL_ELECTION_ID,
        );
        if (state) {
          const activeVoteId = state.data.voteId;
          if (typeof activeVoteId !== 'string' || !activeVoteId) {
            return failure(
              'dependency_failure',
              'Could not verify the active presidential election',
            );
          }
          const activeDocument = await this.dependencies.documents.get(
            COLLECTIONS.communityVotes,
            activeVoteId,
          );
          if (activeDocument) {
            const activeVote = this.dependencies.codecs.vote.decode(
              activeDocument.id,
              activeDocument.data,
            );
            if (
              activeVote.kind === 'presidential_election' &&
              communityVotePhase(activeVote, this.dependencies.clock.now()) !==
                'closed'
            ) {
              return failure(
                'conflict',
                'A presidential election is already open',
              );
            }
          }
        }
      } catch {
        return failure(
          'dependency_failure',
          'Could not verify the active presidential election',
        );
      }
    }

    const id = this.dependencies.ids.next();
    const createdAt = this.dependencies.clock.now();
    const votingStartsAt =
      draft.kind === 'contest'
        ? createdAt
        : addDays(createdAt, draft.nominationDays);
    const votingEndsAt = addDays(votingStartsAt, draft.votingDays);

    if (draft.kind === 'presidential_election') {
      const vote = parseCommunityVote({
        id,
        kind: draft.kind,
        title: draft.title,
        details: draft.details,
        participationAudience: draft.participationAudience,
        options: [],
        createdAt,
        createdBy: actor,
        nominationEndsAt: votingStartsAt,
        votingStartsAt,
        votingEndsAt,
      });
      try {
        const encoded = this.dependencies.codecs.vote.encode(vote);
        await this.dependencies.documents.commit([
          {
            operation: 'put',
            collection: COLLECTIONS.communityVotes,
            id: vote.id,
            data: encoded,
          },
          {
            operation: 'put',
            collection: COLLECTIONS.communityVoteState,
            id: ACTIVE_PRESIDENTIAL_ELECTION_ID,
            data: {
              voteId: vote.id,
              votingEndsAt: encoded.votingEndsAt,
            },
          },
        ]);
      } catch {
        return failure('dependency_failure', 'Could not create the election');
      }
      return this.notifyCreated(vote);
    }

    const optionIds = draft.options.map(() => this.dependencies.ids.next());
    const images = draft.options.flatMap((option) =>
      option.imageLocalUri?.trim()
        ? [localMedia(option.imageLocalUri)]
        : [],
    );
    const buildVote = (imageUrls: readonly string[]) => {
      let imageIndex = 0;
      return parseCommunityVote({
        id,
        kind: draft.kind,
        title: draft.title,
        details: draft.details,
        participationAudience: draft.participationAudience,
        options: draft.options.map((option, index) => {
          const imageUrl = option.imageLocalUri?.trim()
            ? imageUrls[imageIndex++]
            : undefined;
          return {
            id: optionIds[index],
            label: option.label,
            ...(imageUrl ? { imageUrl } : {}),
          };
        }),
        createdAt,
        createdBy: actor,
        votingStartsAt,
        votingEndsAt,
      });
    };
    const mediaResult = await this.dependencies.mediaCoordinator.reconcileGallery({
      folder: `${COLLECTIONS.communityVotes}/${id}`,
      ownerId: actor.id,
      gallery: images,
      persist: async (gallery) => {
        await this.persist(buildVote(gallery.map(({ url }) => url)));
      },
    });
    if (!mediaResult.ok) return mediaResult;
    const notified = await this.notifyCreated(
      buildVote(mediaResult.value.map(({ url }) => url)),
    );
    return notified.ok
      ? success(notified.value, [...mediaResult.warnings, ...notified.warnings])
      : notified;
  }

  async hasSubmittedNomination(
    actor: User | undefined,
    voteId: string,
  ): Promise<Outcome<boolean>> {
    return this.hasReceipt(
      actor,
      voteId,
      COLLECTIONS.communityVoteNominationReceipts,
    );
  }

  async hasSubmittedBallot(
    actor: User | undefined,
    voteId: string,
  ): Promise<Outcome<boolean>> {
    return this.hasReceipt(
      actor,
      voteId,
      COLLECTIONS.communityVoteBallotReceipts,
    );
  }

  async hasUnsubmittedOpenBallot(
    actor: User | undefined,
    votes: readonly CommunityVote[],
  ): Promise<Outcome<boolean>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to view voting participation');
    }
    const openBallots = votes.filter(
      (vote) =>
        communityVotePhase(vote, this.dependencies.clock.now()) === 'voting' &&
        canParticipate(actor.role, vote.participationAudience),
    );
    try {
      const receipts = await Promise.all(
        openBallots.map(({ id }) =>
          this.dependencies.documents.get(
            COLLECTIONS.communityVoteBallotReceipts,
            communityVoteReceiptId(id, actor.id),
          ),
        ),
      );
      return success(receipts.some((receipt) => !receipt));
    } catch {
      return failure(
        'dependency_failure',
        'Could not check open voting participation',
      );
    }
  }

  async nominees(
    actor: User | undefined,
    voteId: string,
  ): Promise<Outcome<readonly CommunityVoteNominee[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view nominees');
    try {
      const documents = await this.dependencies.documents.listWhereEqual(
        COLLECTIONS.communityVoteNominees,
        'voteId',
        voteId,
      );
      let invalidCount = 0;
      const nominees = documents
        .flatMap(({ id, data }) => {
          try {
            return [this.dependencies.codecs.nominee.decode(id, data)];
          } catch {
            invalidCount += 1;
            return [];
          }
        })
        .sort((left, right) => left.displayName.localeCompare(right.displayName));
      return success(
        nominees,
        invalidCount
          ? [
              {
                code: 'partial_completion',
                message: `${invalidCount} invalid nominee ${
                  invalidCount === 1 ? 'was' : 'records were'
                } excluded.`,
              },
            ]
          : [],
      );
    } catch {
      return failure('dependency_failure', 'Could not load nominees');
    }
  }

  async choices(
    actor: User | undefined,
    vote: CommunityVote,
  ): Promise<Outcome<readonly CommunityVotingChoice[]>> {
    if (vote.kind === 'contest') return success(vote.options);
    const nominees = await this.nominees(actor, vote.id);
    return nominees.ok
      ? success(
          nominees.value.map((nominee) => ({
            id: nominee.userId,
            label: nominee.displayName,
            ...(nominee.pitch ? { pitch: nominee.pitch } : {}),
            profileUserId: nominee.userId,
          })),
          nominees.warnings,
        )
      : nominees;
  }

  async submitNomination(
    actor: User | undefined,
    voteId: string,
    action: CommunityNominationAction,
    pitch?: string,
  ): Promise<Outcome<CommunityNominationSubmission>> {
    if (!actor) return failure('unauthenticated', 'Sign in to join nominations');
    if (pitch !== undefined && pitch.length > 500) {
      return failure(
        'validation',
        'Nomination pitch must be 500 characters or fewer',
      );
    }
    const normalizedPitch = pitch?.trim();
    if (action === 'abstain' && normalizedPitch) {
      return failure(
        'validation',
        'A pitch can only be included when nominating yourself',
      );
    }
    const vote = await this.get(actor, voteId);
    if (!vote.ok) return vote;
    if (!canParticipate(actor.role, vote.value.participationAudience)) {
      return failure(
        'forbidden',
        'Only officers can participate in this vote',
      );
    }
    if (
      vote.value.kind !== 'presidential_election' ||
      communityVotePhase(vote.value, this.dependencies.clock.now()) !==
        'nominations'
    ) {
      return failure('conflict', 'Nominations are closed');
    }
    const submitted = await this.hasSubmittedNomination(actor, voteId);
    if (!submitted.ok) return submitted;
    if (submitted.value) {
      return failure('conflict', 'You already responded to nominations');
    }
    try {
      return success(
        await this.dependencies.gateway.submitNomination(
          actor,
          vote.value,
          action,
          normalizedPitch,
        ),
      );
    } catch (error) {
      return votingFailure(error, 'Could not submit your nomination choice');
    }
  }

  async submitBallot(
    actor: User | undefined,
    voteId: string,
    optionId: string,
  ): Promise<Outcome<void>> {
    if (!actor) return failure('unauthenticated', 'Sign in to vote');
    const vote = await this.get(actor, voteId);
    if (!vote.ok) return vote;
    if (!canParticipate(actor.role, vote.value.participationAudience)) {
      return failure(
        'forbidden',
        'Only officers can participate in this vote',
      );
    }
    if (
      communityVotePhase(vote.value, this.dependencies.clock.now()) !== 'voting'
    ) {
      return failure('conflict', 'Voting is not open');
    }
    const choices = await this.choices(actor, vote.value);
    if (!choices.ok) return choices;
    if (!choices.value.some(({ id }) => id === optionId)) {
      return failure('validation', 'Choose a valid voting option');
    }
    const submitted = await this.hasSubmittedBallot(actor, voteId);
    if (!submitted.ok) return submitted;
    if (submitted.value) {
      return failure('conflict', 'You already voted');
    }
    try {
      await this.dependencies.gateway.submitBallot(actor, vote.value, optionId);
      return success(undefined);
    } catch (error) {
      return votingFailure(error, 'Could not submit your vote');
    }
  }

  async results(
    actor: User | undefined,
    voteId: string,
  ): Promise<Outcome<CommunityVoteResults>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view results');
    const vote = await this.get(actor, voteId);
    if (!vote.ok) return vote;
    if (
      communityVotePhase(vote.value, this.dependencies.clock.now()) !== 'closed'
    ) {
      return failure('conflict', 'Results are available after voting closes');
    }
    try {
      return success(await this.dependencies.gateway.getResults(actor, vote.value));
    } catch (error) {
      return votingFailure(error, 'Could not load voting results');
    }
  }

  private async persist(vote: CommunityVote): Promise<void> {
    await this.dependencies.documents.put(
      COLLECTIONS.communityVotes,
      vote.id,
      this.dependencies.codecs.vote.encode(vote),
    );
  }

  private async notifyCreated(vote: CommunityVote): Promise<Outcome<CommunityVote>> {
    const notification =
      vote.kind === 'contest'
        ? {
            title: `Voting is open: ${vote.title}`,
            body: `Cast your vote by ${formatDate(vote.votingEndsAt)}.`,
          }
        : {
            title: 'Presidential election nominations are open',
            body: `Nominate yourself or abstain by ${formatDate(
              vote.votingStartsAt,
            )}. Voting follows through ${formatDate(vote.votingEndsAt)}.`,
          };
    try {
      await this.dependencies.effects.notifyAnnouncement(notification);
      return success(vote);
    } catch {
      return success(vote, [
        {
          code: 'notification_failed',
          message: 'The vote was created, but its push notification failed',
        },
      ]);
    }
  }

  private async hasReceipt(
    actor: User | undefined,
    voteId: string,
    collection: string,
  ): Promise<Outcome<boolean>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view participation');
    try {
      return success(
        Boolean(
          await this.dependencies.documents.get(
            collection,
            communityVoteReceiptId(voteId, actor.id),
          ),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not check your participation');
    }
  }
}

function creationDenied(
  actor: User | undefined,
  kind: CommunityVoteDraft['kind'],
): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to create votes');
  if (
    kind === 'presidential_election' &&
    !canAccessRolePolicy(
      actor.role,
      roleAccessPolicies.createPresidentialElections,
    )
  ) {
    return failure(
      'forbidden',
      roleAccessRequirement(roleAccessPolicies.createPresidentialElections),
    );
  }
  if (
    kind === 'contest' &&
    !canAccessRolePolicy(actor.role, roleAccessPolicies.createContests)
  ) {
    return failure(
      'forbidden',
      roleAccessRequirement(roleAccessPolicies.createContests),
    );
  }
  return undefined;
}

function validateDraft(draft: CommunityVoteDraft): string | undefined {
  if (!draft.title.trim()) return 'Vote title cannot be empty.';
  if (draft.title.trim().length > 120) {
    return 'Vote title must be 120 characters or fewer.';
  }
  if (draft.details.trim().length > 5000) {
    return 'Vote details must be 5,000 characters or fewer.';
  }
  if (!Number.isInteger(draft.votingDays) || draft.votingDays < 1 || draft.votingDays > 14) {
    return 'Voting must last from 1 to 14 days.';
  }
  if (draft.kind === 'presidential_election') {
    if (
      !Number.isInteger(draft.nominationDays) ||
      draft.nominationDays < 1 ||
      draft.nominationDays > 31
    ) {
      return 'Nominations must last from 1 to 31 days.';
    }
    return undefined;
  }
  if (draft.options.length < 2) return 'Add at least two contest options.';
  if (draft.options.length > 20) return 'Contests may have up to 20 options.';
  const normalized = new Set<string>();
  for (const option of draft.options) {
    const label = option.label.trim();
    if (!label) return 'Every contest option needs a label.';
    if (label.length > 120) {
      return 'Contest option labels must be 120 characters or fewer.';
    }
    const key = label.toLocaleLowerCase();
    if (normalized.has(key)) return 'Contest option labels must be unique.';
    normalized.add(key);
  }
  return undefined;
}

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const formatDate = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function votingFailure<T>(error: unknown, fallback: string): Outcome<T> {
  return error instanceof CommunityVotingError
    ? failure(error.code, error.message)
    : failure('dependency_failure', fallback);
}
