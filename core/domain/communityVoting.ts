import { z } from 'zod';

import {
  communityVoteIdSchema,
  communityVoteOptionIdSchema,
  userIdSchema,
} from './ids';
import { userSnapshotSchema } from './models';
import { participationAudienceSchema } from './participation';

const requiredText = z.string().trim().min(1);
const validDate = z.date().refine((date) => !Number.isNaN(date.getTime()), {
  message: 'Expected a valid date',
});

export const communityVoteKindSchema = z.enum([
  'contest',
  'presidential_election',
]);

export const communityVoteOptionSchema = z.object({
  id: communityVoteOptionIdSchema,
  label: requiredText.max(120),
  imageUrl: z.string().url().max(2048).optional(),
});

export const communityVoteSchema = z
  .object({
    id: communityVoteIdSchema,
    kind: communityVoteKindSchema,
    title: requiredText.max(120),
    details: z.string().trim().max(5000),
    participationAudience: participationAudienceSchema,
    options: z.array(communityVoteOptionSchema).max(20),
    createdAt: validDate,
    createdBy: userSnapshotSchema,
    votingStartsAt: validDate,
    votingEndsAt: validDate,
    nominationEndsAt: validDate.optional(),
    votingNotificationSentAt: validDate.optional(),
  })
  .superRefine((vote, context) => {
    if (vote.votingEndsAt.getTime() <= vote.votingStartsAt.getTime()) {
      context.addIssue({
        code: 'custom',
        path: ['votingEndsAt'],
        message: 'Voting must end after it starts',
      });
    }
    if (new Set(vote.options.map(({ id }) => id)).size !== vote.options.length) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Voting option IDs must be unique',
      });
    }
    if (vote.kind === 'contest') {
      if (vote.options.length < 2) {
        context.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Contests need at least two options',
        });
      }
      if (vote.nominationEndsAt) {
        context.addIssue({
          code: 'custom',
          path: ['nominationEndsAt'],
          message: 'Contests cannot have a nomination round',
        });
      }
    } else {
      if (vote.options.length > 0) {
        context.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Presidential candidates come from nominations',
        });
      }
      if (
        !vote.nominationEndsAt ||
        vote.nominationEndsAt.getTime() !== vote.votingStartsAt.getTime()
      ) {
        context.addIssue({
          code: 'custom',
          path: ['nominationEndsAt'],
          message: 'Election nominations must end when voting starts',
        });
      }
    }
  });

export const communityVoteNomineeSchema = z.object({
  voteId: communityVoteIdSchema,
  userId: userIdSchema,
  displayName: requiredText.max(60),
  pitch: z.string().trim().max(500).optional(),
  nominatedAt: validDate,
});

export type CommunityVoteKind = z.infer<typeof communityVoteKindSchema>;
export type CommunityVoteOption = Readonly<
  z.infer<typeof communityVoteOptionSchema>
>;
export type CommunityVote = Readonly<z.infer<typeof communityVoteSchema>>;
export type CommunityVoteNominee = Readonly<
  z.infer<typeof communityVoteNomineeSchema>
>;
export type CommunityVotePhase = 'nominations' | 'voting' | 'closed';

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const parseCommunityVote = (value: unknown): CommunityVote =>
  deepFreeze(communityVoteSchema.parse(value));

export const parseCommunityVoteNominee = (
  value: unknown,
): CommunityVoteNominee => deepFreeze(communityVoteNomineeSchema.parse(value));

export const communityVotePhase = (
  vote: CommunityVote,
  now: Date,
): CommunityVotePhase => {
  if (now.getTime() >= vote.votingEndsAt.getTime()) return 'closed';
  if (now.getTime() >= vote.votingStartsAt.getTime()) return 'voting';
  return 'nominations';
};

export const communityVoteReceiptId = (
  voteId: string,
  userId: string,
): string => `${userId}__${voteId}`;
