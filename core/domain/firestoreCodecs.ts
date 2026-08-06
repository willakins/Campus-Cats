import {
  Announcement,
  CatalogEntry,
  CatalogFavorite,
  Contact,
  ManagedUser,
  PublicProfile,
  Sighting,
  Station,
  WhitelistApplication,
  parseAnnouncement,
  parseCatalogEntry,
  parseCatalogFavorite,
  parseContact,
  parseManagedUser,
  parsePublicProfile,
  parseSighting,
  parseStation,
  parseWhitelistApplication,
} from './models';
import {
  ImportedCatalogProfile,
  ImportedObservation,
  InaturalistSyncStatus,
  parseImportedCatalogProfile,
  parseImportedObservation,
  parseInaturalistSyncStatus,
} from './inaturalist';
import {
  AppSettings,
  parseStoredAppSettings,
} from './appSettings';
import {
  ContentContributor,
  parseContentContributor,
} from './contributors';
import {
  ClubEvent,
  Survey,
  SurveyResponse,
  SurveySubmissionReceipt,
  parseClubEvent,
  parseSurvey,
  parseSurveyResponse,
  parseSurveySubmissionReceipt,
} from './community';

export const COLLECTIONS = {
  sightings: 'cat-sightings',
  catalog: 'catalog',
  catalogFavorites: 'catalog-favorites',
  stations: 'stations',
  announcements: 'announcements',
  contacts: 'contact-info',
  users: 'users',
  publicProfiles: 'public-profiles',
  whitelist: 'whitelist',
  inaturalistObservations: 'inaturalist-observations',
  inaturalistCatalog: 'inaturalist-guide-profiles',
  integrationState: 'integration-state',
  appSettings: 'app-settings',
  contentContributors: 'content-contributors',
  events: 'community-events',
  surveys: 'community-surveys',
  surveyResponses: 'survey-responses',
  surveySubmissionReceipts: 'survey-submission-receipts',
} as const;

export const APP_SETTINGS_DOCUMENT_ID = 'public';

export interface TimestampFactory<EncodedDate = unknown> {
  fromDate(value: Date): EncodedDate;
}

export interface FirestoreCodec<Model, Encoded = Record<string, unknown>> {
  decode(id: string, data: unknown): Model;
  encode(value: Model): Encoded;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected Firestore document data');
  }
  return value as Record<string, unknown>;
}

function decodeDate(value: unknown): Date {
  if (value instanceof Date) {
    return new Date(value);
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }
  throw new Error('Expected a Firestore timestamp');
}

export function createFirestoreCodecs<EncodedDate>(
  timestamps: TimestampFactory<EncodedDate>,
) {
  const user: FirestoreCodec<ManagedUser> = {
    decode: (id, value) => {
      const data = record(value);
      const notices = data.disciplinaryNotices ?? [];
      if (!Array.isArray(notices)) {
        throw new Error('Expected disciplinary notices to be an array');
      }
      return parseManagedUser({
        id,
        ...data,
        banned: data.banned ?? false,
        disciplinaryNotices: notices.map((value) => {
          const notice = record(value);
          return {
            ...notice,
            createdAt: decodeDate(notice.createdAt),
          };
        }),
      });
    },
    encode: ({ email, role, banned, disciplinaryNotices }) => ({
      email,
      role,
      banned,
      disciplinaryNotices: disciplinaryNotices.map((notice) => ({
        ...notice,
        createdAt: timestamps.fromDate(notice.createdAt),
      })),
    }),
  };

  const publicProfile: FirestoreCodec<PublicProfile> = {
    decode: (id, value) =>
      parsePublicProfile({
        id,
        ...record(value),
      }),
    encode: ({ id: _id, ...value }) => value,
  };

  const sighting: FirestoreCodec<Sighting> = {
    decode: (id, value) => {
      const data = record(value);
      return parseSighting({
        id,
        name: data.name,
        info: data.info,
        fed: data.fed,
        health: data.health,
        date: decodeDate(data.spotted_time),
        location: data.location,
        createdBy: data.createdBy,
        timeOfDay: data.timeofDay,
      });
    },
    encode: ({ id: _id, date, timeOfDay, createdBy: _createdBy, ...value }) => ({
      ...value,
      spotted_time: timestamps.fromDate(date),
      timeofDay: timeOfDay,
    }),
  };

  const catalog: FirestoreCodec<CatalogEntry> = {
    decode: (id, value) => {
      const data = record(value);
      return parseCatalogEntry({
        id,
        ...data,
        createdAt: decodeDate(data.createdAt),
      });
    },
    encode: ({ id: _id, createdAt, createdBy: _createdBy, ...value }) => ({
      ...value,
      createdAt: timestamps.fromDate(createdAt),
    }),
  };

  const catalogFavorite: FirestoreCodec<CatalogFavorite> = {
    decode: (id, value) => {
      const data = record(value);
      return parseCatalogFavorite({
        userId: id,
        catalogId: data.catalogId,
        createdAt: decodeDate(data.createdAt),
      });
    },
    encode: ({ userId: _userId, createdAt, ...value }) => ({
      ...value,
      createdAt: timestamps.fromDate(createdAt),
    }),
  };

  const station: FirestoreCodec<Station> = {
    decode: (id, value) => {
      const data = record(value);
      return parseStation({
        id,
        ...data,
        lastStocked: decodeDate(data.lastStocked),
      });
    },
    encode: ({ id: _id, lastStocked, ...value }) => ({
      ...value,
      lastStocked: timestamps.fromDate(lastStocked),
    }),
  };

  const announcement: FirestoreCodec<Announcement> = {
    decode: (id, value) => {
      const data = record(value);
      return parseAnnouncement({
        id,
        ...data,
        createdAt: decodeDate(data.createdAt),
      });
    },
    encode: ({ id: _id, createdAt, ...value }) => ({
      ...value,
      createdAt: timestamps.fromDate(createdAt),
    }),
  };

  const whitelist: FirestoreCodec<WhitelistApplication> = {
    decode: (id, value) =>
      parseWhitelistApplication({ id, ...record(value) }),
    encode: ({ id: _id, ...value }) => value,
  };

  const contact: FirestoreCodec<Contact> = {
    decode: (id, value) => parseContact({ id, ...record(value) }),
    encode: ({ id: _id, ...value }) => value,
  };

  const appSettings: FirestoreCodec<AppSettings> = {
    decode: (_id, value) => parseStoredAppSettings(record(value)),
    encode: (value) => ({ ...value }),
  };

  const contentContributor: FirestoreCodec<ContentContributor> = {
    decode: (_id, value) => parseContentContributor(record(value)),
    encode: (value) => ({ ...value }),
  };

  const clubEvent: FirestoreCodec<ClubEvent> = {
    decode: (id, value) => {
      const data = record(value);
      return parseClubEvent({
        id,
        ...data,
        startsAt: decodeDate(data.startsAt),
        expiresAt: decodeDate(data.expiresAt),
        createdAt: decodeDate(data.createdAt),
      });
    },
    encode: ({ id: _id, startsAt, expiresAt, createdAt, ...value }) => ({
      ...value,
      startsAt: timestamps.fromDate(startsAt),
      expiresAt: timestamps.fromDate(expiresAt),
      createdAt: timestamps.fromDate(createdAt),
    }),
  };

  const survey: FirestoreCodec<Survey> = {
    decode: (id, value) => {
      const data = record(value);
      return parseSurvey({
        id,
        ...data,
        createdAt: decodeDate(data.createdAt),
        closedAt:
          data.closedAt === undefined ? undefined : decodeDate(data.closedAt),
      });
    },
    encode: ({ id: _id, createdAt, closedAt, ...value }) => ({
      ...value,
      createdAt: timestamps.fromDate(createdAt),
      ...(closedAt ? { closedAt: timestamps.fromDate(closedAt) } : {}),
    }),
  };

  const surveyResponse: FirestoreCodec<SurveyResponse> = {
    decode: (id, value) => {
      const data = record(value);
      return parseSurveyResponse({
        id,
        ...data,
        submittedAt: decodeDate(data.submittedAt),
      });
    },
    encode: ({ id: _id, submittedAt, respondent, ...value }) => ({
      ...value,
      ...(respondent ? { respondent } : {}),
      submittedAt: timestamps.fromDate(submittedAt),
    }),
  };

  const surveySubmissionReceipt: FirestoreCodec<SurveySubmissionReceipt> = {
    decode: (_id, value) => {
      const data = record(value);
      return parseSurveySubmissionReceipt({
        ...data,
        submittedAt: decodeDate(data.submittedAt),
      });
    },
    encode: ({ submittedAt, ...value }) => ({
      ...value,
      submittedAt: timestamps.fromDate(submittedAt),
    }),
  };

  const inaturalistObservation: FirestoreCodec<ImportedObservation> = {
    decode: (id, value) => {
      const data = record(value);
      const moderation = record(data.moderation);
      return parseImportedObservation({
        ...data,
        id: Number(id),
        sourceUpdatedAt: decodeDate(data.sourceUpdatedAt),
        observedAt: decodeDate(data.observedAt),
        importedAt: decodeDate(data.importedAt),
        syncedAt: decodeDate(data.syncedAt),
        moderation: {
          ...moderation,
          updatedAt:
            moderation.updatedAt === undefined
              ? undefined
              : decodeDate(moderation.updatedAt),
        },
      });
    },
    encode: ({
      id: _id,
      sourceUpdatedAt,
      observedAt,
      importedAt,
      syncedAt,
      moderation,
      ...value
    }) => ({
      schemaVersion: 1,
      ...value,
      sourceUpdatedAt: timestamps.fromDate(sourceUpdatedAt),
      observedAt: timestamps.fromDate(observedAt),
      importedAt: timestamps.fromDate(importedAt),
      syncedAt: timestamps.fromDate(syncedAt),
      moderation: {
        ...moderation,
        updatedAt: moderation.updatedAt
          ? timestamps.fromDate(moderation.updatedAt)
          : undefined,
      },
    }),
  };

  const inaturalistCatalog: FirestoreCodec<ImportedCatalogProfile> = {
    decode: (id, value) => {
      const data = record(value);
      const moderation = record(data.moderation);
      return parseImportedCatalogProfile({
        ...data,
        id: Number(id),
        sourceUpdatedAt: decodeDate(data.sourceUpdatedAt),
        importedAt: decodeDate(data.importedAt),
        syncedAt: decodeDate(data.syncedAt),
        moderation: {
          ...moderation,
          updatedAt:
            moderation.updatedAt === undefined
              ? undefined
              : decodeDate(moderation.updatedAt),
        },
      });
    },
    encode: ({
      id: _id,
      sourceUpdatedAt,
      importedAt,
      syncedAt,
      moderation,
      ...value
    }) => ({
      schemaVersion: 1,
      ...value,
      sourceUpdatedAt: timestamps.fromDate(sourceUpdatedAt),
      importedAt: timestamps.fromDate(importedAt),
      syncedAt: timestamps.fromDate(syncedAt),
      moderation: {
        ...moderation,
        updatedAt: moderation.updatedAt
          ? timestamps.fromDate(moderation.updatedAt)
          : undefined,
      },
    }),
  };

  const inaturalistStatus: FirestoreCodec<InaturalistSyncStatus> = {
    decode: (_id, value) => {
      const data = record(value);
      const observations =
        data.observations === undefined ? {} : record(data.observations);
      const catalogStatus =
        data.catalog === undefined ? {} : record(data.catalog);
      const decodeOptional = (date: unknown) =>
        date === undefined || date === null ? undefined : decodeDate(date);
      return parseInaturalistSyncStatus({
        ...data,
        startedAt: decodeOptional(data.startedAt),
        completedAt: decodeOptional(data.completedAt),
        observations: {
          ...observations,
          fetched: observations.fetched ?? 0,
          created: observations.created ?? 0,
          updated: observations.updated ?? 0,
          deactivated: observations.deactivated ?? 0,
          errors: observations.errors ?? [],
          lastAttemptAt: decodeOptional(observations.lastAttemptAt),
          lastSuccessAt: decodeOptional(observations.lastSuccessAt),
        },
        catalog: {
          ...catalogStatus,
          fetched: catalogStatus.fetched ?? 0,
          created: catalogStatus.created ?? 0,
          updated: catalogStatus.updated ?? 0,
          deactivated: catalogStatus.deactivated ?? 0,
          errors: catalogStatus.errors ?? [],
          lastAttemptAt: decodeOptional(catalogStatus.lastAttemptAt),
          lastSuccessAt: decodeOptional(catalogStatus.lastSuccessAt),
        },
        ambiguousCatalogMatches: data.ambiguousCatalogMatches ?? [],
      });
    },
    encode: (value) => ({
      ...value,
      startedAt: value.startedAt
        ? timestamps.fromDate(value.startedAt)
        : undefined,
      completedAt: value.completedAt
        ? timestamps.fromDate(value.completedAt)
        : undefined,
      observations: {
        ...value.observations,
        lastAttemptAt: value.observations.lastAttemptAt
          ? timestamps.fromDate(value.observations.lastAttemptAt)
          : undefined,
        lastSuccessAt: value.observations.lastSuccessAt
          ? timestamps.fromDate(value.observations.lastSuccessAt)
          : undefined,
      },
      catalog: {
        ...value.catalog,
        lastAttemptAt: value.catalog.lastAttemptAt
          ? timestamps.fromDate(value.catalog.lastAttemptAt)
          : undefined,
        lastSuccessAt: value.catalog.lastSuccessAt
          ? timestamps.fromDate(value.catalog.lastSuccessAt)
          : undefined,
      },
    }),
  };

  return {
    user,
    publicProfile,
    sighting,
    catalog,
    catalogFavorite,
    station,
    announcement,
    whitelist,
    contact,
    appSettings,
    contentContributor,
    clubEvent,
    survey,
    surveyResponse,
    surveySubmissionReceipt,
    inaturalistObservation,
    inaturalistCatalog,
    inaturalistStatus,
  } as const;
}
