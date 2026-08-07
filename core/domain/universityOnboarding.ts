import { z } from 'zod';
import { hexColorSchema } from './appSettings';

const clubDiscoverySchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  emailEnabled: z.boolean().default(true),
  saml: z
    .object({
      provider: z.literal('gt-sso'),
      label: z.string().trim().min(1).max(80),
    })
    .optional(),
});

export const universitySearchResultSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().length(2),
    emailDomains: z.array(z.string().trim().min(1).max(253)).max(12),
    timezone: z.string().trim().min(1).max(100).optional(),
    status: z.enum(['unclaimed', 'pending', 'mapped']),
    club: clubDiscoverySchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'mapped' && !value.club) {
      context.addIssue({
        code: 'custom',
        path: ['club'],
        message: 'Mapped universities require club discovery data',
      });
    }
    if (value.status !== 'mapped' && value.club) {
      context.addIssue({
        code: 'custom',
        path: ['club'],
        message: 'Only mapped universities may include club discovery data',
      });
    }
  });

export const clubSetupDraftSchema = z.object({
  universityId: z.string().trim().min(1).max(40),
  clubName: z.string().trim().min(1).max(160),
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  presidentChoice: z.enum(['self', 'other']),
  presidentEmail: z.string().trim().toLowerCase().email().max(320),
});

export const clubSetupReceiptSchema = z.object({
  requestId: z.string().trim().min(1).max(120),
  universityId: z.string().trim().min(1).max(40),
  maskedEmail: z.string().trim().min(1).max(320),
  expiresAt: z.string().datetime({ offset: true }),
});

export const clubSetupVerificationSchema = z.object({
  university: universitySearchResultSchema,
  passwordSetupSent: z.boolean(),
});

export const universitySelectionSchema = z.object({
  universityId: z.string().trim().min(1).max(40),
  universityName: z.string().trim().min(1).max(200),
  clubId: z.string().trim().min(1).max(120).optional(),
});

export type ClubDiscovery = Readonly<z.infer<typeof clubDiscoverySchema>>;
export type UniversitySearchResult = Readonly<
  z.infer<typeof universitySearchResultSchema>
>;
export type ClubSetupDraft = Readonly<z.infer<typeof clubSetupDraftSchema>>;
export type ClubSetupReceipt = Readonly<z.infer<typeof clubSetupReceiptSchema>>;
export type ClubSetupVerification = Readonly<
  z.infer<typeof clubSetupVerificationSchema>
>;
export type UniversitySelection = Readonly<
  z.infer<typeof universitySelectionSchema>
>;

export const normalizeUniversityQuery = (value: string): string =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export const defaultClubName = (universityName: string): string =>
  `${universityName.trim()} Campus Cats`.slice(0, 160);

export const emailMatchesUniversity = (
  email: string,
  approvedDomains: readonly string[],
): boolean => {
  const domain = email.trim().toLocaleLowerCase().split('@')[1];
  if (!domain) return false;
  return approvedDomains.some((candidate) => {
    const approved = candidate.trim().toLocaleLowerCase();
    return Boolean(approved) &&
      (domain === approved || domain.endsWith(`.${approved}`));
  });
};

export const parseUniversitySearchResult = (
  value: unknown,
): UniversitySearchResult => Object.freeze(universitySearchResultSchema.parse(value));

export const parseClubSetupDraft = (value: unknown): ClubSetupDraft =>
  Object.freeze(clubSetupDraftSchema.parse(value));

export const parseClubSetupReceipt = (value: unknown): ClubSetupReceipt =>
  Object.freeze(clubSetupReceiptSchema.parse(value));

export const parseClubSetupVerification = (
  value: unknown,
): ClubSetupVerification =>
  Object.freeze(clubSetupVerificationSchema.parse(value));

export const parseUniversitySelection = (
  value: unknown,
): UniversitySelection => Object.freeze(universitySelectionSchema.parse(value));
