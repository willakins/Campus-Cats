import {
  Announcement,
  CatalogEntry,
  CatalogFavorite,
  CatalogTagSettings,
  CatalogTagAssignment,
  Contact,
  Comment,
  ManagedUser,
  PublicProfile,
  Sighting,
  Station,
  WhitelistApplication,
  parseAnnouncement,
  parseCatalogEntry,
  parseCatalogFavorite,
  parseCatalogTagSettings,
  parseCatalogTagAssignment,
  parseContact,
  parseComment,
  parseManagedUser,
  parsePublicProfile,
  parseSighting,
  parseStation,
  parseWhitelistApplication,
} from './models';
import {
  ImportedCatalogProfile,
  InaturalistPublicLink,
  ImportedObservation,
  InaturalistSyncStatus,
  parseImportedCatalogProfile,
  parseImportedObservation,
  parseInaturalistSyncStatus,
  parseInaturalistPublicLink,
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
import {
  CommunityVote,
  CommunityVoteNominee,
  parseCommunityVote,
  parseCommunityVoteNominee,
} from './communityVoting';

export const COLLECTIONS = {
  sightings: 'cat-sightings',
  catalog: 'catalog',
  catalogFavorites: 'catalog-favorites',
  catalogTagSettings: 'catalog-tag-settings',
  catalogTagAssignments: 'catalog-tag-assignments',
  stations: 'stations',
  announcements: 'announcements',
  announcementReadReceipts: 'announcement-read-receipts',
  contacts: 'contact-info',
  users: 'users',
  publicProfiles: 'public-profiles',
  whitelist: 'whitelist',
  inaturalistObservations: 'inaturalist-observations',
  inaturalistCatalog: 'inaturalist-guide-profiles',
  inaturalistPublicLinks: 'inaturalist-public-links',
  integrationState: 'integration-state',
  appSettings: 'app-settings',
  contentContributors: 'content-contributors',
  events: 'community-events',
  eventReadReceipts: 'event-read-receipts',
  surveys: 'community-surveys',
  surveyResponses: 'survey-responses',
  surveySubmissionReceipts: 'survey-submission-receipts',
  communityVotes: 'community-votes',
  communityVoteState: 'community-vote-state',
  communityVoteNominees: 'community-vote-nominees',
  communityVoteNominationReceipts: 'community-vote-nomination-receipts',
  communityVoteBallots: 'community-vote-ballots',
  communityVoteBallotReceipts: 'community-vote-ballot-receipts',
  sightingComments: 'sighting-comments',
  catalogComments: 'catalog-comments',
  stationComments: 'station-comments',
  inaturalistCommentModeration: 'inaturalist-comment-moderation',
} as const;

export const APP_SETTINGS_DOCUMENT_ID = 'public';
export const CATALOG_TAG_SETTINGS_DOCUMENT_ID = 'catalog';

export interface StoredDateCodec<EncodedDate = unknown> {
  encode(value: Date): EncodedDate;
  decode(value: unknown): Date;
}

export const dateObjectCodec: StoredDateCodec<Date> = {
  encode: (value) => new Date(value),
  decode: (value) => {
    if (!(value instanceof Date)) {
      throw new Error('Expected a persisted date');
    }
    return new Date(value);
  },
};

export interface PersistenceCodec<Model, Encoded = Record<string, unknown>> {
  decode(id: string, data: unknown): Model;
  encode(value: Model): Encoded;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected persisted document data');
  }
  return value as Record<string, unknown>;
}

export function createPersistenceCodecs<EncodedDate>(
  dates: StoredDateCodec<EncodedDate>,
) {
  const user: PersistenceCodec<ManagedUser> = {
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
            createdAt: dates.decode(notice.createdAt),
          };
        }),
      });
    },
    encode: ({ email, role, clubId, platformAdmin, banned, disciplinaryNotices }) => ({
      email,
      role,
      clubId,
      platformAdmin,
      banned,
      disciplinaryNotices: disciplinaryNotices.map((notice) => ({
        ...notice,
        createdAt: dates.encode(notice.createdAt),
      })),
    }),
  };

  const publicProfile: PersistenceCodec<PublicProfile> = {
    decode: (id, value) =>
      parsePublicProfile({
        id,
        ...record(value),
      }),
    encode: ({ id: _id, ...value }) => value,
  };

  const comment: PersistenceCodec<Comment> = {
    decode: (id, value) => {
      const data = record(value);
      return parseComment({
        id,
        ...data,
        createdAt: dates.decode(data.createdAt),
        sourceUpdatedAt:
          data.sourceUpdatedAt === undefined
            ? undefined
            : dates.decode(data.sourceUpdatedAt),
      });
    },
    encode: ({ target, body, createdAt, createdById, source }) => {
      if (source !== 'campus-cats' || !createdById) {
        throw new Error('Only Campus Cats comments can be written by the app');
      }
      return {
        body,
        createdById,
        target: {
          ...target,
          documentId: commentTargetDocument(target).id,
        },
        targetKey: commentTargetKey(target),
        createdAt: dates.encode(createdAt),
      };
    },
  };

  const sighting: PersistenceCodec<Sighting> = {
    decode: (id, value) => {
      const data = record(value);
      return parseSighting({
        id,
        name: data.name,
        info: data.info,
        fed: data.fed,
        health: data.health,
        date: dates.decode(data.spotted_time),
        location: data.location,
        createdBy: data.createdBy,
        timeOfDay: data.timeofDay,
      });
    },
    encode: ({ id: _id, date, timeOfDay, createdBy: _createdBy, ...value }) => ({
      ...value,
      spotted_time: dates.encode(date),
      timeofDay: timeOfDay,
    }),
  };

  const catalog: PersistenceCodec<CatalogEntry> = {
    decode: (id, value) => {
      const data = record(value);
      return parseCatalogEntry({
        id,
        ...data,
        createdAt: dates.decode(data.createdAt),
      });
    },
    encode: ({ id: _id, createdAt, createdBy: _createdBy, ...value }) => ({
      ...value,
      createdAt: dates.encode(createdAt),
    }),
  };

  const catalogFavorite: PersistenceCodec<CatalogFavorite> = {
    decode: (id, value) => {
      const data = record(value);
      return parseCatalogFavorite({
        userId: id,
        catalogId: data.catalogId,
        createdAt: dates.decode(data.createdAt),
      });
    },
    encode: ({ userId: _userId, createdAt, ...value }) => ({
      ...value,
      createdAt: dates.encode(createdAt),
    }),
  };

  const catalogTagSettings: PersistenceCodec<CatalogTagSettings> = {
    decode: (_id, value) => parseCatalogTagSettings(record(value)),
    encode: (value) => ({ tags: value.tags }),
  };

  const catalogTagAssignment: PersistenceCodec<CatalogTagAssignment> = {
    decode: (id, value) =>
      parseCatalogTagAssignment({ catalogId: id, ...record(value) }),
    encode: ({ catalogId: _catalogId, ...value }) => value,
  };

  const station: PersistenceCodec<Station> = {
    decode: (id, value) => {
      const data = record(value);
      return parseStation({
        id,
        ...data,
        lastStocked: dates.decode(data.lastStocked),
      });
    },
    encode: ({ id: _id, lastStocked, ...value }) => ({
      ...value,
      lastStocked: dates.encode(lastStocked),
    }),
  };

  const announcement: PersistenceCodec<Announcement> = {
    decode: (id, value) => {
      const data = record(value);
      return parseAnnouncement({
        id,
        ...data,
        createdAt: dates.decode(data.createdAt),
      });
    },
    encode: ({ id: _id, createdAt, ...value }) => ({
      ...value,
      createdAt: dates.encode(createdAt),
    }),
  };

  const whitelist: PersistenceCodec<WhitelistApplication> = {
    decode: (id, value) =>
      parseWhitelistApplication({ id, ...record(value) }),
    encode: ({ id: _id, ...value }) => value,
  };

  const contact: PersistenceCodec<Contact> = {
    decode: (id, value) => parseContact({ id, ...record(value) }),
    encode: ({ id: _id, ...value }) => value,
  };

  const appSettings: PersistenceCodec<AppSettings> = {
    decode: (_id, value) => parseStoredAppSettings(record(value)),
    encode: (value) => ({ ...value }),
  };

  const contentContributor: PersistenceCodec<ContentContributor> = {
    decode: (_id, value) => parseContentContributor(record(value)),
    encode: (value) => ({ ...value }),
  };

  const clubEvent: PersistenceCodec<ClubEvent> = {
    decode: (id, value) => {
      const data = record(value);
      return parseClubEvent({
        id,
        ...data,
        startsAt: dates.decode(data.startsAt),
        expiresAt: dates.decode(data.expiresAt),
        createdAt: dates.decode(data.createdAt),
      });
    },
    encode: ({ id: _id, startsAt, expiresAt, createdAt, ...value }) => ({
      ...value,
      startsAt: dates.encode(startsAt),
      expiresAt: dates.encode(expiresAt),
      createdAt: dates.encode(createdAt),
    }),
  };

  const survey: PersistenceCodec<Survey> = {
    decode: (id, value) => {
      const data = record(value);
      return parseSurvey({
        id,
        ...data,
        createdAt: dates.decode(data.createdAt),
        closedAt:
          data.closedAt === undefined ? undefined : dates.decode(data.closedAt),
      });
    },
    encode: ({ id: _id, createdAt, closedAt, ...value }) => ({
      ...value,
      createdAt: dates.encode(createdAt),
      ...(closedAt ? { closedAt: dates.encode(closedAt) } : {}),
    }),
  };

  const surveyResponse: PersistenceCodec<SurveyResponse> = {
    decode: (id, value) => {
      const data = record(value);
      return parseSurveyResponse({
        id,
        ...data,
        submittedAt: dates.decode(data.submittedAt),
      });
    },
    encode: ({ id: _id, submittedAt, respondent, ...value }) => ({
      ...value,
      ...(respondent ? { respondent } : {}),
      submittedAt: dates.encode(submittedAt),
    }),
  };

  const surveySubmissionReceipt: PersistenceCodec<SurveySubmissionReceipt> = {
    decode: (_id, value) => {
      const data = record(value);
      return parseSurveySubmissionReceipt({
        ...data,
        submittedAt: dates.decode(data.submittedAt),
      });
    },
    encode: ({ submittedAt, ...value }) => ({
      ...value,
      submittedAt: dates.encode(submittedAt),
    }),
  };

  const communityVote: PersistenceCodec<CommunityVote> = {
    decode: (id, value) => {
      const data = record(value);
      return parseCommunityVote({
        id,
        ...data,
        createdAt: dates.decode(data.createdAt),
        votingStartsAt: dates.decode(data.votingStartsAt),
        votingEndsAt: dates.decode(data.votingEndsAt),
        nominationEndsAt:
          data.nominationEndsAt === undefined
            ? undefined
            : dates.decode(data.nominationEndsAt),
        votingNotificationSentAt:
          data.votingNotificationSentAt === undefined
            ? undefined
            : dates.decode(data.votingNotificationSentAt),
      });
    },
    encode: ({
      id: _id,
      createdAt,
      votingStartsAt,
      votingEndsAt,
      nominationEndsAt,
      votingNotificationSentAt,
      ...value
    }) => ({
      ...value,
      createdAt: dates.encode(createdAt),
      votingStartsAt: dates.encode(votingStartsAt),
      votingEndsAt: dates.encode(votingEndsAt),
      ...(nominationEndsAt
        ? { nominationEndsAt: dates.encode(nominationEndsAt) }
        : {}),
      ...(votingNotificationSentAt
        ? {
            votingNotificationSentAt: dates.encode(
              votingNotificationSentAt,
            ),
          }
        : {}),
    }),
  };

  const communityVoteNominee: PersistenceCodec<CommunityVoteNominee> = {
    decode: (_id, value) => {
      const data = record(value);
      return parseCommunityVoteNominee({
        ...data,
        nominatedAt: dates.decode(data.nominatedAt),
      });
    },
    encode: ({ nominatedAt, ...value }) => ({
      ...value,
      nominatedAt: dates.encode(nominatedAt),
    }),
  };

  const inaturalistObservation: PersistenceCodec<ImportedObservation> = {
    decode: (id, value) => {
      const data = record(value);
      const moderation = record(data.moderation);
      return parseImportedObservation({
        ...data,
        id: Number(id),
        sourceUpdatedAt: dates.decode(data.sourceUpdatedAt),
        observedAt: dates.decode(data.observedAt),
        importedAt: dates.decode(data.importedAt),
        syncedAt: dates.decode(data.syncedAt),
        moderation: {
          ...moderation,
          updatedAt:
            moderation.updatedAt === undefined
              ? undefined
              : dates.decode(moderation.updatedAt),
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
      sourceUpdatedAt: dates.encode(sourceUpdatedAt),
      observedAt: dates.encode(observedAt),
      importedAt: dates.encode(importedAt),
      syncedAt: dates.encode(syncedAt),
      moderation: {
        ...moderation,
        updatedAt: moderation.updatedAt
          ? dates.encode(moderation.updatedAt)
          : undefined,
      },
    }),
  };

  const inaturalistCatalog: PersistenceCodec<ImportedCatalogProfile> = {
    decode: (id, value) => {
      const data = record(value);
      const moderation = record(data.moderation);
      return parseImportedCatalogProfile({
        ...data,
        id: Number(id),
        sourceUpdatedAt: dates.decode(data.sourceUpdatedAt),
        importedAt: dates.decode(data.importedAt),
        syncedAt: dates.decode(data.syncedAt),
        moderation: {
          ...moderation,
          updatedAt:
            moderation.updatedAt === undefined
              ? undefined
              : dates.decode(moderation.updatedAt),
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
      sourceUpdatedAt: dates.encode(sourceUpdatedAt),
      importedAt: dates.encode(importedAt),
      syncedAt: dates.encode(syncedAt),
      moderation: {
        ...moderation,
        updatedAt: moderation.updatedAt
          ? dates.encode(moderation.updatedAt)
          : undefined,
      },
    }),
  };

  const inaturalistStatus: PersistenceCodec<InaturalistSyncStatus> = {
    decode: (_id, value) => {
      const data = record(value);
      const observations =
        data.observations === undefined ? {} : record(data.observations);
      const catalogStatus =
        data.catalog === undefined ? {} : record(data.catalog);
      const decodeOptional = (date: unknown) =>
        date === undefined || date === null ? undefined : dates.decode(date);
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
        ? dates.encode(value.startedAt)
        : undefined,
      completedAt: value.completedAt
        ? dates.encode(value.completedAt)
        : undefined,
      observations: {
        ...value.observations,
        lastAttemptAt: value.observations.lastAttemptAt
          ? dates.encode(value.observations.lastAttemptAt)
          : undefined,
        lastSuccessAt: value.observations.lastSuccessAt
          ? dates.encode(value.observations.lastSuccessAt)
          : undefined,
      },
      catalog: {
        ...value.catalog,
        lastAttemptAt: value.catalog.lastAttemptAt
          ? dates.encode(value.catalog.lastAttemptAt)
          : undefined,
        lastSuccessAt: value.catalog.lastSuccessAt
          ? dates.encode(value.catalog.lastSuccessAt)
          : undefined,
      },
    }),
  };

  const inaturalistPublicLink: PersistenceCodec<InaturalistPublicLink> = {
    decode: (id, value) => {
      const data = record(value);
      return parseInaturalistPublicLink({
        ...data,
        inaturalistUserId: Number(id),
        linkedAt: dates.decode(data.linkedAt),
      });
    },
    encode: ({ inaturalistUserId: _id, linkedAt, ...value }) => ({
      ...value,
      linkedAt: dates.encode(linkedAt),
    }),
  };

  return {
    user,
    publicProfile,
    comment,
    sighting,
    catalog,
    catalogFavorite,
    catalogTagSettings,
    catalogTagAssignment,
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
    communityVote,
    communityVoteNominee,
    inaturalistObservation,
    inaturalistCatalog,
    inaturalistStatus,
    inaturalistPublicLink,
  } as const;
}

export type ApplicationCodecs = ReturnType<typeof createPersistenceCodecs>;

export const commentTargetKey = ({
  kind,
  id,
}: {
  readonly kind: string;
  readonly id: string;
}): string => `${kind}:${id}`;

export const commentCollection = ({
  kind,
}: {
  readonly kind: 'sighting' | 'catalog' | 'station';
}): string =>
  kind === 'sighting'
    ? COLLECTIONS.sightingComments
    : kind === 'catalog'
      ? COLLECTIONS.catalogComments
      : COLLECTIONS.stationComments;

export const commentTargetDocument = ({
  kind,
  id,
}: {
  readonly kind: string;
  readonly id: string;
}): { readonly collection: string; readonly id: string } => {
  const importedSighting = /^inat-observation-(\d+)$/.exec(id);
  if (kind === 'sighting' && importedSighting) {
    return {
      collection: COLLECTIONS.inaturalistObservations,
      id: importedSighting[1],
    };
  }
  const importedCatalog = /^inat-guide-(\d+)$/.exec(id);
  if (kind === 'catalog' && importedCatalog) {
    return {
      collection: COLLECTIONS.inaturalistCatalog,
      id: importedCatalog[1],
    };
  }
  return {
    collection:
      kind === 'sighting'
        ? COLLECTIONS.sightings
        : kind === 'catalog'
          ? COLLECTIONS.catalog
          : COLLECTIONS.stations,
    id,
  };
};
