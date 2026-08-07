import { z } from 'zod';

import {
  announcementIdSchema,
  catalogEntryIdSchema,
  catalogTagIdSchema,
  contactIdSchema,
  sightingIdSchema,
  stationIdSchema,
  userIdSchema,
  whitelistApplicationIdSchema,
} from './ids';
import { roleSchema } from './roles';
import { achievementIdSchema } from './achievements';

const requiredText = z.string().trim().min(1);
const optionalHttpUrl = z
  .union([
    z.literal(''),
    z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine(
        (value) => value.startsWith('https://') || value.startsWith('http://'),
        { message: 'Expected an http or https URL' },
      ),
  ])
  .default('');
const validDate = z.date().refine((date) => !Number.isNaN(date.getTime()), {
  message: 'Expected a valid date',
});

export const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const userSchema = z.object({
  id: userIdSchema,
  email: z.string().trim().email(),
  role: roleSchema,
  clubId: z.string().trim().min(1).max(120).default('campus-cats'),
  platformAdmin: z.boolean().default(false),
});

export const disciplinaryNoticeSchema = z.object({
  id: requiredText,
  message: z.string().trim().min(1).max(500),
  createdAt: validDate,
  issuedById: userIdSchema,
  issuedByEmail: z.string().trim().email(),
});

export const managedUserSchema = userSchema.extend({
  banned: z.boolean().default(false),
  disciplinaryNotices: z.array(disciplinaryNoticeSchema).default([]),
});

export const publicProfileSchema = z
  .object({
    id: userIdSchema,
    displayName: z.string().trim().min(1).max(60),
    bio: z.string().trim().max(500).default(''),
    profilePhotoUrl: z
      .union([z.literal(''), z.string().url().max(2048)])
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

export const sightingSchema = z.object({
  id: sightingIdSchema,
  name: requiredText,
  info: z.string(),
  fed: z.boolean(),
  health: z.boolean(),
  date: validDate,
  location: coordinatesSchema,
  createdBy: userSchema.optional(),
  timeOfDay: requiredText,
});

export const catSchema = z.object({
  name: requiredText,
  descShort: requiredText,
  descLong: requiredText,
  colorPattern: requiredText,
  behavior: z.string(),
  yearsRecorded: requiredText,
  AoR: requiredText,
  currentStatus: z.enum([
    'Feral',
    'Adopted',
    'Deceased',
    'Frat Cat',
    'Unknown',
  ]),
  furLength: z.enum(['Short', 'Medium', 'Long', 'Unknown']),
  furPattern: requiredText,
  tnr: z.enum(['Yes', 'No', 'Unknown']),
  sex: z.enum(['Male', 'Female', 'Unknown']),
});

export const catalogEntrySchema = z.object({
  id: catalogEntryIdSchema,
  cat: catSchema,
  credits: z.string(),
  createdAt: validDate,
  createdBy: userSchema.optional(),
});

export const catalogFavoriteSchema = z.object({
  userId: userIdSchema,
  catalogId: catalogEntryIdSchema,
  createdAt: validDate,
});

export const catalogTagSchema = z.object({
  id: catalogTagIdSchema,
  label: z.string().trim().min(1).max(40),
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
  name: requiredText,
  location: coordinatesSchema,
  lastStocked: validDate,
  stockingFreq: z.number().finite().positive(),
  knownCats: z.string(),
  createdBy: userSchema,
});

export const announcementSchema = z.object({
  id: announcementIdSchema,
  title: requiredText,
  info: requiredText,
  createdAt: validDate,
  createdBy: userSchema,
  authorAlias: z.string(),
});

export const whitelistApplicationSchema = z.object({
  id: whitelistApplicationIdSchema,
  name: requiredText,
  graduationYear: requiredText,
  email: z.string().trim().email(),
  codeWord: z.string(),
});

export const contactSchema = z.object({
  id: contactIdSchema,
  name: requiredText,
  email: z.string().trim().email(),
  instagramUrl: optionalHttpUrl,
  facebookUrl: optionalHttpUrl,
  websiteUrl: optionalHttpUrl,
});

export type Coordinates = Readonly<z.infer<typeof coordinatesSchema>>;
export type User = Readonly<z.infer<typeof userSchema>>;
export type DisciplinaryNotice = Readonly<
  z.infer<typeof disciplinaryNoticeSchema>
>;
export type ManagedUser = Readonly<z.infer<typeof managedUserSchema>>;
export type PublicProfile = Readonly<z.infer<typeof publicProfileSchema>>;
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
export type Announcement = Readonly<z.infer<typeof announcementSchema>>;
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
export const parseAnnouncement = (value: unknown): Announcement =>
  parseImmutable(announcementSchema, value);
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
