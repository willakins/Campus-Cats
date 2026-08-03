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

export const COLLECTIONS = {
  sightings: 'cat-sightings',
  catalog: 'catalog',
  stations: 'stations',
  announcements: 'announcements',
  contacts: 'contact-info',
  users: 'users',
  whitelist: 'whitelist',
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

  return {
    user,
    sighting,
    catalog,
    station,
    announcement,
    whitelist,
    contact,
  } as const;
}
