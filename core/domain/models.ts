import { z } from 'zod';

import {
  announcementIdSchema,
  catalogEntryIdSchema,
  contactIdSchema,
  sightingIdSchema,
  stationIdSchema,
  userIdSchema,
  whitelistApplicationIdSchema,
} from './ids';
import { roleSchema } from './roles';

const requiredText = z.string().trim().min(1);
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
});

export const sightingSchema = z.object({
  id: sightingIdSchema,
  name: requiredText,
  info: z.string(),
  fed: z.boolean(),
  health: z.boolean(),
  date: validDate,
  location: coordinatesSchema,
  createdBy: userSchema,
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
  createdBy: userSchema,
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
});

export type Coordinates = Readonly<z.infer<typeof coordinatesSchema>>;
export type User = Readonly<z.infer<typeof userSchema>>;
export type Sighting = Readonly<z.infer<typeof sightingSchema>>;
export type Cat = Readonly<z.infer<typeof catSchema>>;
export type CatalogEntry = Readonly<z.infer<typeof catalogEntrySchema>>;
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
export const parseSighting = (value: unknown): Sighting =>
  parseImmutable(sightingSchema, value);
export const parseCatalogEntry = (value: unknown): CatalogEntry =>
  parseImmutable(catalogEntrySchema, value);
export const parseStation = (value: unknown): Station =>
  parseImmutable(stationSchema, value);
export const parseAnnouncement = (value: unknown): Announcement =>
  parseImmutable(announcementSchema, value);
export const parseWhitelistApplication = (
  value: unknown,
): WhitelistApplication => parseImmutable(whitelistApplicationSchema, value);
export const parseContact = (value: unknown): Contact =>
  parseImmutable(contactSchema, value);
