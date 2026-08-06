import { z } from 'zod';

import { DisplayMediaAsset, ExternalMediaAsset, MediaAssetId } from '../ports';
import { CatalogEntry, Cat, Coordinates, Sighting, User } from './models';

export const INATURALIST_PROJECT_ID = 149475;
export const INATURALIST_GUIDE_ID = 18800;
export const INATURALIST_CAT_FIELD_ID = 16302;

const validDate = z.date().refine((date) => !Number.isNaN(date.getTime()), {
  message: 'Expected a valid date',
});
const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim().length === 0
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
);
const mediaIdSchema = z.custom<MediaAssetId>(
  (value) => typeof value === 'string' && value.trim().length > 0,
  'Expected a media asset ID',
);

export const externalMediaAssetSchema = z.object({
  kind: z.literal('external'),
  id: mediaIdSchema,
  url: z.string().url(),
  thumbnailUrl: z.string().url(),
  role: z.enum(['profile', 'gallery']),
  sourceUrl: z.string().url(),
  attribution: requiredText,
  licenseCode: requiredText,
  licenseUrl: z.string().url(),
});

export const importModerationSchema = z.object({
  hidden: z.boolean(),
  reason: z.string().default(''),
  updatedBy: optionalText,
  updatedAt: validDate.optional(),
});

const observerSchema = z.object({
  id: z.number().int().positive(),
  login: requiredText,
  displayName: optionalText,
});

const coordinatesSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const importedObservationSchema = z.object({
  id: z.number().int().positive(),
  uuid: z.string().uuid(),
  projectId: z.number().int().positive(),
  sourceUrl: z.string().url(),
  sourceUpdatedAt: validDate,
  observedAt: validDate,
  observedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observedTimePrecision: z.enum(['exact', 'date']),
  displayName: requiredText,
  description: z.string(),
  qualityGrade: z.enum(['casual', 'needs_id', 'research']),
  observer: observerSchema,
  location: coordinatesSchema.nullable(),
  positionalAccuracy: z.number().finite().nonnegative().nullable(),
  observationFieldValue: optionalText,
  guideTaxonId: z.number().int().positive().optional(),
  observationLicenseCode: optionalText,
  photos: z.array(externalMediaAssetSchema),
  sourceActive: z.boolean(),
  visible: z.boolean(),
  importedAt: validDate,
  syncedAt: validDate,
  lastSeenRunId: requiredText,
  moderation: importModerationSchema,
});

const catalogStatusSchema = z.enum([
  'Feral',
  'Adopted',
  'Deceased',
  'Frat Cat',
  'Unknown',
]);
const furLengthSchema = z.enum(['Short', 'Medium', 'Long', 'Unknown']);
const tnrSchema = z.enum(['Yes', 'No', 'Unknown']);
const sexSchema = z.enum(['Male', 'Female', 'Unknown']);

export const importedCatalogMetadataSchema = z.object({
  yearsRecorded: z.array(requiredText),
  areasOfResidence: z.array(requiredText),
  currentStatus: catalogStatusSchema.optional(),
  furLength: furLengthSchema.optional(),
  furPatterns: z.array(requiredText),
  tnr: tnrSchema.optional(),
  sex: sexSchema.optional(),
});

export const catalogOverrideSchema = z.object({
  name: optionalText,
  descShort: optionalText,
  descLong: optionalText,
  colorPattern: optionalText,
  behavior: optionalText,
  yearsRecorded: optionalText,
  AoR: optionalText,
  currentStatus: catalogStatusSchema.optional(),
  furLength: furLengthSchema.optional(),
  furPattern: optionalText,
  tnr: tnrSchema.optional(),
  sex: sexSchema.optional(),
  coverPhotoId: optionalText,
});

export const importedCatalogProfileSchema = z.object({
  id: z.number().int().positive(),
  guideId: z.number().int().positive(),
  sourceUrl: z.string().url(),
  sourceUpdatedAt: validDate,
  displayName: requiredText,
  shortDescription: requiredText,
  metadata: importedCatalogMetadataSchema,
  photos: z.array(externalMediaAssetSchema),
  sourceActive: z.boolean(),
  visible: z.boolean(),
  importedAt: validDate,
  syncedAt: validDate,
  lastSeenRunId: requiredText,
  moderation: importModerationSchema,
  overrides: catalogOverrideSchema.default({}),
  linkedLocalCatalogId: optionalText,
  matchStatus: z.enum(['unlinked', 'linked', 'ambiguous']),
});

export type ImportModeration = Readonly<z.infer<typeof importModerationSchema>>;
export type ImportedObservation = Readonly<
  z.infer<typeof importedObservationSchema>
>;
export type ImportedCatalogMetadata = Readonly<
  z.infer<typeof importedCatalogMetadataSchema>
>;
export type CatalogOverride = Readonly<z.infer<typeof catalogOverrideSchema>>;
export type ImportedCatalogProfile = Readonly<
  z.infer<typeof importedCatalogProfileSchema>
>;

export interface LocalSightingRecord extends Sighting {
  readonly source: 'campus-cats';
  readonly location: Coordinates;
}

export interface InaturalistSightingRecord {
  readonly source: 'inaturalist';
  readonly id: string;
  readonly sourceId: number;
  readonly name: string;
  readonly info: string;
  readonly date: Date;
  readonly observedOn: string;
  readonly observedTimePrecision: ImportedObservation['observedTimePrecision'];
  readonly location: Coordinates | null;
  readonly qualityGrade: ImportedObservation['qualityGrade'];
  readonly observer: ImportedObservation['observer'];
  readonly sourceUrl: string;
  readonly observationFieldValue?: string;
  readonly guideTaxonId?: number;
  readonly observationLicenseCode?: string;
  readonly positionalAccuracy: number | null;
  readonly sourceActive: boolean;
  readonly visible: boolean;
}

export type SightingRecord = LocalSightingRecord | InaturalistSightingRecord;

export type CatalogCatView = Readonly<
  Pick<Cat, 'name' | 'descShort'> & Partial<Omit<Cat, 'name' | 'descShort'>>
>;

export interface LocalCatalogRecord extends CatalogEntry {
  readonly source: 'campus-cats';
}

export interface InaturalistCatalogRecord {
  readonly source: 'inaturalist';
  readonly id: string;
  readonly sourceId: number;
  readonly cat: CatalogCatView;
  readonly credits: string;
  readonly sourceUrl: string;
  readonly sourceUpdatedAt: Date;
  readonly linkedLocalCatalogId?: string;
  readonly matchStatus: ImportedCatalogProfile['matchStatus'];
  readonly sourceActive: boolean;
  readonly visible: boolean;
  readonly moderation: ImportModeration;
  readonly localContribution?: Readonly<{
    createdAt: Date;
    createdBy?: User;
    credits: string;
  }>;
}

export type CatalogRecord = LocalCatalogRecord | InaturalistCatalogRecord;

export interface InaturalistSyncSourceStatus {
  readonly lastAttemptAt?: Date;
  readonly lastSuccessAt?: Date;
  readonly fetched: number;
  readonly created: number;
  readonly updated: number;
  readonly deactivated: number;
  readonly errors: readonly string[];
}

export interface InaturalistSyncStatus {
  readonly running: boolean;
  readonly lastStatus?: 'success' | 'partial' | 'failed' | 'skipped';
  readonly runId?: string;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly observations: InaturalistSyncSourceStatus;
  readonly catalog: InaturalistSyncSourceStatus;
  readonly ambiguousCatalogMatches: readonly number[];
}

const syncSourceStatusSchema = z.object({
  lastAttemptAt: validDate.optional(),
  lastSuccessAt: validDate.optional(),
  fetched: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  deactivated: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});

export const inaturalistSyncStatusSchema = z.object({
  running: z.boolean(),
  lastStatus: z.enum(['success', 'partial', 'failed', 'skipped']).optional(),
  runId: optionalText,
  startedAt: validDate.optional(),
  completedAt: validDate.optional(),
  observations: syncSourceStatusSchema,
  catalog: syncSourceStatusSchema,
  ambiguousCatalogMatches: z.array(z.number().int().positive()),
});

export function parseImportedObservation(value: unknown): ImportedObservation {
  return deepFreeze(importedObservationSchema.parse(value));
}

export function parseImportedCatalogProfile(
  value: unknown,
): ImportedCatalogProfile {
  return deepFreeze(importedCatalogProfileSchema.parse(value));
}

export function parseInaturalistSyncStatus(
  value: unknown,
): InaturalistSyncStatus {
  return deepFreeze(inaturalistSyncStatusSchema.parse(value));
}

export function normalizeCatName(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .toLocaleLowerCase('en-US')
    .replace(/[\u2018\u2019\u201c\u201d"']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function localSightingRecord(value: Sighting): LocalSightingRecord {
  return deepFreeze({ ...value, source: 'campus-cats' as const });
}

export function importedSightingRecord(
  value: ImportedObservation,
): InaturalistSightingRecord {
  return deepFreeze({
    source: 'inaturalist' as const,
    id: `inat-observation-${value.id}`,
    sourceId: value.id,
    name: value.displayName,
    info: value.description,
    date: value.observedAt,
    observedOn: value.observedOn,
    observedTimePrecision: value.observedTimePrecision,
    location: value.location,
    qualityGrade: value.qualityGrade,
    observer: value.observer,
    sourceUrl: value.sourceUrl,
    observationFieldValue: value.observationFieldValue,
    guideTaxonId: value.guideTaxonId,
    observationLicenseCode: value.observationLicenseCode,
    positionalAccuracy: value.positionalAccuracy,
    sourceActive: value.sourceActive,
    visible: value.visible,
  });
}

export function localCatalogRecord(value: CatalogEntry): LocalCatalogRecord {
  return deepFreeze({ ...value, source: 'campus-cats' as const });
}

export function importedCatalogMedia(
  profile: ImportedCatalogProfile,
): readonly DisplayMediaAsset[] {
  const selectedCover = profile.overrides.coverPhotoId;
  const ordered = selectedCover
    ? [
        ...profile.photos.filter(({ id }) => id === selectedCover),
        ...profile.photos.filter(({ id }) => id !== selectedCover),
      ]
    : profile.photos;
  return deepFreeze(
    ordered.map((photo, index) => ({
      ...photo,
      role: index === 0 ? ('profile' as const) : ('gallery' as const),
    })),
  );
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

export type { ExternalMediaAsset };
