import { z } from 'zod';

import { userSchema } from './models';

export const contributionKindSchema = z.enum(['sighting', 'catalog']);
export type ContributionKind = z.infer<typeof contributionKindSchema>;

export const contentContributorSchema = z.object({
  kind: contributionKindSchema,
  contentId: z.string().trim().min(1).max(200),
  user: userSchema,
});

export type ContentContributor = Readonly<
  z.infer<typeof contentContributorSchema>
>;

export const parseContentContributor = (value: unknown): ContentContributor =>
  Object.freeze(contentContributorSchema.parse(value));

export const contributorDocumentId = (
  kind: ContributionKind,
  contentId: string,
): string => `${kind}__${contentId}`;
