import {
  Announcement,
  CatalogEntry,
  Contact,
  Sighting,
  Station,
  User,
  WhitelistApplication,
  parseAnnouncement,
  parseCatalogEntry,
  parseContact,
  parseSighting,
  parseStation,
  parseUser,
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

export const COLLECTIONS = {
  sightings: 'cat-sightings',
  catalog: 'catalog',
  stations: 'stations',
  announcements: 'announcements',
  contacts: 'contact-info',
  users: 'users',
  whitelist: 'whitelist',
  inaturalistObservations: 'inaturalist-observations',
  inaturalistCatalog: 'inaturalist-guide-profiles',
  integrationState: 'integration-state',
} as const;

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
  const user: FirestoreCodec<User> = {
    decode: (id, value) => parseUser({ id, ...record(value) }),
    encode: ({ email, role }) => ({ email, role }),
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
    encode: ({ id: _id, date, timeOfDay, ...value }) => ({
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
    encode: ({ id: _id, createdAt, ...value }) => ({
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
      const observations = record(data.observations);
      const catalogStatus = record(data.catalog);
      const decodeOptional = (date: unknown) =>
        date === undefined || date === null ? undefined : decodeDate(date);
      return parseInaturalistSyncStatus({
        ...data,
        startedAt: decodeOptional(data.startedAt),
        completedAt: decodeOptional(data.completedAt),
        observations: {
          ...observations,
          lastAttemptAt: decodeOptional(observations.lastAttemptAt),
          lastSuccessAt: decodeOptional(observations.lastSuccessAt),
        },
        catalog: {
          ...catalogStatus,
          lastAttemptAt: decodeOptional(catalogStatus.lastAttemptAt),
          lastSuccessAt: decodeOptional(catalogStatus.lastSuccessAt),
        },
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
    sighting,
    catalog,
    station,
    announcement,
    whitelist,
    contact,
    inaturalistObservation,
    inaturalistCatalog,
    inaturalistStatus,
  } as const;
}
