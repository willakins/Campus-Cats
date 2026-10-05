import { z } from 'zod';
import { plainText, httpUrlSchema } from './inputValidation';

import {
  alertIdSchema,
  catalogEntryIdSchema,
  catalogTagIdSchema,
  contactIdSchema,
  commentIdSchema,
  sightingIdSchema,
  stationIdSchema,
  userIdSchema,
  whitelistApplicationIdSchema,
} from './ids';
import { roleSchema } from './roles';
import { achievementIdSchema } from './achievements';

const requiredText = plainText.trim().min(1);
const httpUrl = httpUrlSchema;
const optionalHttpUrl = z.union([z.literal(''), httpUrl]).default('');
const optionalSocialUrl = (hosts: readonly string[]) =>
  optionalHttpUrl.refine(
    (value) =>
      !value || (httpUrlSchema.safeParse(value).success && hosts.includes(new URL(value).hostname.replace(/^www\./, ''))),
    { message: `Expected a ${hosts.join(' or ')} URL` },
  );
const validDate = z.date().refine((date) => !Number.isNaN(date.getTime()), {
  message: 'Expected a valid date',
});

export const sightingDateError = (
  date: Date,
  currentDate: Date,
): string | undefined => {
  if (Number.isNaN(date.getTime()))
    return 'Please select a valid sighting date.';
  const selectedDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const currentDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  ).getTime();
  return selectedDay > currentDay
    ? 'Sightings cannot be reported for a future date.'
    : undefined;
};

export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const userSnapshotSchema = z.object({
  id: userIdSchema,
  email: plainText.trim().email().max(320),
  role: roleSchema,
  clubId: plainText.trim().min(1).max(120).default('campus-cats'),
  platformAdmin: z.boolean().default(false),
});

export const userSchema = userSnapshotSchema.extend({
  agreedToTerms: z.boolean().optional(),
  termsVersion: plainText.trim().max(40).optional(),
});

export const disciplinaryNoticeSchema = z.object({
  id: requiredText,
  message: plainText.trim().min(1).max(500),
  createdAt: validDate,
  issuedById: userIdSchema,
  issuedByEmail: plainText.trim().email().max(320),
});

export const managedUserSchema = userSchema.extend({
  banned: z.boolean().default(false),
  disciplinaryNotices: z.array(disciplinaryNoticeSchema).default([]),
});

export const publicProfileSchema = z
  .object({
    id: userIdSchema,
    displayName: plainText.trim().min(1).max(60),
    bio: plainText.trim().max(500).default(''),
    profilePhotoUrl: z
      .union([z.literal(''), httpUrlSchema])
      .default(''),
    role: roleSchema,
    achievementIds: z.array(achievementIdSchema).default([]),
    selectedTitleId: z.union([z.literal(''), achievementIdSchema]).default(''),
  })
  .superRefine((profile, context) => {
    if (
      new Set(profile.achievementIds).size !== profile.achievementIds.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['achievementIds'],
        message: 'Achievements must be unique',
      });
    }
    if (
      profile.selectedTitleId &&
      !profile.achievementIds.includes(profile.selectedTitleId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['selectedTitleId'],
        message: 'The displayed title must be unlocked',
      });
    }
  });

export const commentTargetSchema = z.object({
  kind: z.enum(['sighting', 'catalog', 'station']),
  id: plainText.trim().min(1).max(200),
});

export const COMMENT_CHARACTER_LIMIT = 300;

const externalCommentAuthorSchema = z.object({
  id: z.number().int().positive(),
  login: requiredText,
  displayName: plainText.trim().min(1).max(120).optional(),
  sourceUrl: httpUrlSchema,
});

export const commentSchema = z
  .object({
    id: commentIdSchema,
    target: commentTargetSchema,
    body: plainText.trim().min(1).max(10000),
    createdAt: validDate,
    source: z.enum(['campus-cats', 'inaturalist']).default('campus-cats'),
    createdById: userIdSchema.optional(),
    author: publicProfileSchema.optional(),
    externalAuthor: externalCommentAuthorSchema.optional(),
    sourceCommentId: z.number().int().positive().optional(),
    sourceCommentUuid: z.string().uuid().optional(),
    sourceUrl: httpUrlSchema.optional(),
    sourceUpdatedAt: validDate.optional(),
    lastSeenRunId: requiredText.optional(),
  })
  .superRefine((comment, context) => {
    if (comment.source === 'campus-cats' && !comment.createdById) {
      context.addIssue({
        code: 'custom',
        path: ['createdById'],
        message: 'Campus Cats comments require a member author',
      });
    }
    if (
      comment.source === 'campus-cats' &&
      comment.body.length > COMMENT_CHARACTER_LIMIT
    ) {
      context.addIssue({
        code: 'too_big',
        maximum: COMMENT_CHARACTER_LIMIT,
        origin: 'string',
        inclusive: true,
        path: ['body'],
        message: `Campus Cats comments cannot exceed ${COMMENT_CHARACTER_LIMIT} characters`,
      });
    }
    if (
      comment.source === 'inaturalist' &&
      (!comment.externalAuthor ||
        !comment.sourceCommentId ||
        !comment.sourceCommentUuid ||
        !comment.sourceUrl ||
        !comment.sourceUpdatedAt ||
        !comment.lastSeenRunId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'iNaturalist comments require source attribution',
      });
    }
  });

export const sightingSchema = z.object({
  id: sightingIdSchema,
  name: requiredText.max(120),
  info: plainText.max(5000),
  fed: z.boolean(),
  health: z.boolean(),
  date: validDate,
  location: coordinatesSchema,
  createdBy: userSnapshotSchema.optional(),
  timeOfDay: requiredText.max(40),
});

export const catSchema = z.object({
  name: requiredText.max(120),
  descShort: requiredText.max(300),
  descLong: requiredText.max(5000),
  colorPattern: requiredText.max(120),
  behavior: plainText.max(5000),
  yearsRecorded: requiredText.max(120),
  AoR: requiredText.max(300),
  currentStatus: z.enum([
    'Feral',
    'Adopted',
    'Deceased',
    'Frat Cat',
    'Unknown',
  ]),
  furLength: z.enum(['Short', 'Medium', 'Long', 'Unknown']),
  furPattern: requiredText.max(120),
  tnr: z.enum(['Yes', 'No', 'Unknown']),
  sex: z.enum(['Male', 'Female', 'Unknown']),
});

export const catalogEntrySchema = z.object({
  id: catalogEntryIdSchema,
  cat: catSchema,
  credits: plainText.max(1000),
  createdAt: validDate,
  createdBy: userSnapshotSchema.optional(),
});

export const catalogFavoriteSchema = z.object({
  userId: userIdSchema,
  catalogId: catalogEntryIdSchema,
  createdAt: validDate,
});

export const catalogTagSchema = z.object({
  id: catalogTagIdSchema,
  label: plainText.trim().min(1).max(40),
});

export const catalogTagSettingsSchema = z
  .object({
    tags: z.array(catalogTagSchema).max(50),
  })
  .superRefine(({ tags }, context) => {
    const ids = new Set<string>();
    const labels = new Set<string>();
    tags.forEach((tag, index) => {
      const normalizedLabel = tag.label.toLocaleLowerCase();
      if (ids.has(tag.id)) {
        context.addIssue({
          code: 'custom',
          path: ['tags', index, 'id'],
          message: 'Tag IDs must be unique',
        });
      }
      if (labels.has(normalizedLabel)) {
        context.addIssue({
          code: 'custom',
          path: ['tags', index, 'label'],
          message: 'Tag labels must be unique',
        });
      }
      ids.add(tag.id);
      labels.add(normalizedLabel);
    });
  });

export const catalogTagAssignmentSchema = z
  .object({
    catalogId: catalogEntryIdSchema,
    tagIds: z.array(catalogTagIdSchema).max(50),
  })
  .superRefine(({ tagIds }, context) => {
    if (new Set(tagIds).size !== tagIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['tagIds'],
        message: 'Assigned tags must be unique',
      });
    }
  });

export const stationSchema = z.object({
  id: stationIdSchema,
  name: requiredText.max(120),
  location: coordinatesSchema,
  lastStocked: validDate,
  stockingFreq: z.number().finite().positive(),
  knownCats: plainText.max(1000),
  createdBy: userSnapshotSchema,
});

export const alertSchema = z.object({
  id: alertIdSchema,
  title: requiredText.max(120),
  info: requiredText.max(5000),
  createdAt: validDate,
  createdBy: userSnapshotSchema,
  authorAlias: plainText.max(120),
});

export const whitelistApplicationSchema = z.object({
  id: whitelistApplicationIdSchema,
  name: requiredText.max(200),
  graduationYear: plainText.trim().max(20),
  email: plainText.trim().email().max(320),
  codeWord: plainText.max(200),
});

export const contactSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    if (record.websiteUrls !== undefined) return value;
    return {
      ...record,
      websiteUrls:
        typeof record.websiteUrl === 'string' && record.websiteUrl
          ? [record.websiteUrl]
          : [],
    };
  },
  z.object({
    id: contactIdSchema,
    name: requiredText.max(120),
    email: plainText.trim().email().max(320),
    instagramUrl: optionalSocialUrl(['instagram.com']),
    xUrl: optionalSocialUrl(['x.com']),
    websiteUrls: z.array(httpUrl).max(3).default([]),
  }),
);

export type Coordinates = Readonly<z.infer<typeof coordinatesSchema>>;
export type User = Readonly<z.infer<typeof userSchema>>;
export type DisciplinaryNotice = Readonly<
  z.infer<typeof disciplinaryNoticeSchema>
>;
export type ManagedUser = Readonly<z.infer<typeof managedUserSchema>>;
export type PublicProfile = Readonly<z.infer<typeof publicProfileSchema>>;
export type CommentTarget = Readonly<z.infer<typeof commentTargetSchema>>;
export type Comment = Readonly<z.infer<typeof commentSchema>>;
export type Sighting = Readonly<z.infer<typeof sightingSchema>>;
export type Cat = Readonly<z.infer<typeof catSchema>>;
export type CatStatus = Cat['currentStatus'];
export type Fur = Cat['furLength'];
export type TNRStatus = Cat['tnr'];
export type Sex = Cat['sex'];
export type CatalogEntry = Readonly<z.infer<typeof catalogEntrySchema>>;
export type CatalogFavorite = Readonly<z.infer<typeof catalogFavoriteSchema>>;
export type CatalogTag = Readonly<z.infer<typeof catalogTagSchema>>;
export type CatalogTagSettings = Readonly<
  z.infer<typeof catalogTagSettingsSchema>
>;
export type CatalogTagAssignment = Readonly<
  z.infer<typeof catalogTagAssignmentSchema>
>;
export type Station = Readonly<z.infer<typeof stationSchema>>;
export type Alert = Readonly<z.infer<typeof alertSchema>>;
export type WhitelistApplication = Readonly<
  z.infer<typeof whitelistApplicationSchema>
>;
export type Contact = Readonly<z.infer<typeof contactSchema>>;

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function parseImmutable<Schema extends z.ZodTypeAny>(
  schema: Schema,
  value: unknown,
): Readonly<z.infer<Schema>> {
  return deepFreeze(schema.parse(value));
}

export const parseUser = (value: unknown): User =>
  parseImmutable(userSchema, value);
export const parseManagedUser = (value: unknown): ManagedUser =>
  parseImmutable(managedUserSchema, value);
export const parsePublicProfile = (value: unknown): PublicProfile =>
  parseImmutable(publicProfileSchema, value);
export const parseCommentTarget = (value: unknown): CommentTarget =>
  parseImmutable(commentTargetSchema, value);
export const parseComment = (value: unknown): Comment =>
  parseImmutable(commentSchema, value);
export const parseSighting = (value: unknown): Sighting =>
  parseImmutable(sightingSchema, value);
export const parseCatalogEntry = (value: unknown): CatalogEntry =>
  parseImmutable(catalogEntrySchema, value);
export const parseCatalogFavorite = (value: unknown): CatalogFavorite =>
  parseImmutable(catalogFavoriteSchema, value);
export const parseCatalogTag = (value: unknown): CatalogTag =>
  parseImmutable(catalogTagSchema, value);
export const parseCatalogTagSettings = (value: unknown): CatalogTagSettings =>
  parseImmutable(catalogTagSettingsSchema, value);
export const parseCatalogTagAssignment = (
  value: unknown,
): CatalogTagAssignment => parseImmutable(catalogTagAssignmentSchema, value);
export const parseStation = (value: unknown): Station =>
  parseImmutable(stationSchema, value);
export const parseAlert = (value: unknown): Alert =>
  parseImmutable(alertSchema, value);
export const parseWhitelistApplication = (
  value: unknown,
): WhitelistApplication => parseImmutable(whitelistApplicationSchema, value);
export const parseContact = (value: unknown): Contact =>
  parseImmutable(contactSchema, value);

export const DEFAULT_CATALOG_TAGS: readonly CatalogTag[] = deepFreeze(
  catalogTagSettingsSchema.parse({
    tags: [
      { id: 'adopted', label: 'Adopted' },
      { id: 'feral', label: 'Feral' },
      { id: 'frat-cat', label: 'Frat Cat' },
      { id: 'deceased', label: 'Deceased' },
      { id: 'tnr-complete', label: 'TNR complete' },
      { id: 'needs-tnr', label: 'Needs TNR' },
      { id: 'female', label: 'Female' },
      { id: 'male', label: 'Male' },
      { id: 'short-hair', label: 'Short hair' },
      { id: 'medium-hair', label: 'Medium hair' },
      { id: 'long-hair', label: 'Long hair' },
    ],
  }).tags,
);
