import { mediaAssetId } from '../ports';
import { createFirestoreCodecs } from './firestoreCodecs';
import {
  externalMediaAssetSchema,
  importedCatalogProfileSchema,
  importedObservationSchema,
  importedCatalogMedia,
  normalizeCatName,
  parseImportedCatalogProfile,
  parseImportedObservation,
} from './inaturalist';

const timestamp = new Date('2026-07-07T23:07:14.000Z');

const licensedPhoto = {
  kind: 'external' as const,
  id: mediaAssetId('inat-photo-1'),
  url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/large.jpg',
  thumbnailUrl:
    'https://inaturalist-open-data.s3.amazonaws.com/photos/1/small.jpg',
  role: 'profile' as const,
  sourceUrl: 'https://www.inaturalist.org/photos/1',
  attribution: 'Observer, some rights reserved (CC BY-NC)',
  licenseCode: 'CC-BY-NC',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
};

describe('iNaturalist domain contracts', () => {
  it('normalizes only the primary cat name for deterministic exact matching', () => {
    expect(normalizeCatName('  Jack (\u201cJackie\u201d)  ')).toBe('jack');
    expect(normalizeCatName('Mimi (black-and-white with chin spot)')).toBe(
      'mimi',
    );
    expect(normalizeCatName('Black-and-White')).toBe('black and white');
  });

  it('parses an immutable imported observation without app-only facts', () => {
    const observation = parseImportedObservation({
      id: 321,
      uuid: 'a1d112b8-954b-4a65-a574-d73092f1cd38',
      projectId: 149475,
      sourceUrl: 'https://www.inaturalist.org/observations/321',
      sourceUpdatedAt: timestamp,
      observedAt: timestamp,
      observedOn: '2026-07-07',
      observedTimePrecision: 'exact',
      displayName: 'Mimi',
      description: 'Seen near Tech Parkway',
      qualityGrade: 'research',
      observer: { id: 42, login: 'observer', displayName: 'Observer' },
      location: { latitude: 33.776, longitude: -84.396 },
      positionalAccuracy: 10,
      observationFieldValue: 'Mimi (black-and-white with chin spot)',
      guideTaxonId: 2113386,
      observationLicenseCode: 'CC-BY-NC',
      photos: [licensedPhoto],
      sourceActive: true,
      visible: true,
      importedAt: timestamp,
      syncedAt: timestamp,
      lastSeenRunId: 'run-1',
      moderation: { hidden: false },
    });

    expect(observation).not.toHaveProperty('fed');
    expect(observation).not.toHaveProperty('health');
    expect(observation).not.toHaveProperty('createdBy');
    expect(observation.photos[0]).toEqual(licensedPhoto);
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.photos)).toBe(true);
  });

  it('allows public observations without coordinates or photos', () => {
    const observation = parseImportedObservation({
      id: 322,
      uuid: 'cdd07dc6-0cc1-43ef-95b6-e600fb763fc0',
      projectId: 149475,
      sourceUrl: 'https://www.inaturalist.org/observations/322',
      sourceUpdatedAt: timestamp,
      observedAt: timestamp,
      observedOn: '2026-07-07',
      observedTimePrecision: 'date',
      displayName: 'Domestic cat',
      description: '',
      qualityGrade: 'casual',
      observer: { id: 43, login: 'another-observer' },
      location: null,
      positionalAccuracy: null,
      photos: [],
      sourceActive: true,
      visible: true,
      importedAt: timestamp,
      syncedAt: timestamp,
      lastSeenRunId: 'run-1',
      moderation: { hidden: false },
    });

    expect(observation.location).toBeNull();
    expect(observation.photos).toEqual([]);
  });

  it('parses guide metadata, local overrides, and a persistent local link', () => {
    const profile = parseImportedCatalogProfile({
      id: 2113386,
      guideId: 18800,
      sourceUrl: 'https://www.inaturalist.org/guide_taxa/2113386',
      sourceUpdatedAt: timestamp,
      displayName: 'Mimi',
      shortDescription: 'Black-and-white male with chin-spot',
      metadata: {
        yearsRecorded: ['2023', '2024', '2025'],
        areasOfResidence: ['Central Campus', 'Tech Parkway'],
        currentStatus: 'Feral',
        furLength: 'Short',
        furPatterns: ['Black and White'],
        tnr: 'Yes',
        sex: 'Male',
      },
      photos: [licensedPhoto],
      sourceActive: true,
      visible: true,
      importedAt: timestamp,
      syncedAt: timestamp,
      lastSeenRunId: 'run-1',
      moderation: { hidden: false },
      overrides: { behavior: 'Keeps a cautious distance.' },
      linkedLocalCatalogId: 'local-mimi',
      matchStatus: 'linked',
    });

    expect(profile.overrides.behavior).toBe('Keeps a cautious distance.');
    expect(profile.linkedLocalCatalogId).toBe('local-mimi');
    expect(Object.isFrozen(profile.metadata)).toBe(true);
  });

  it('promotes an officer-selected licensed guide cover without changing identity', () => {
    const secondPhoto = {
      ...licensedPhoto,
      id: mediaAssetId('inat-photo-2'),
      url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/2/large.jpg',
      thumbnailUrl:
        'https://inaturalist-open-data.s3.amazonaws.com/photos/2/small.jpg',
    };
    const profile = parseImportedCatalogProfile({
      id: 2113386,
      guideId: 18800,
      sourceUrl: 'https://www.inaturalist.org/guide_taxa/2113386',
      sourceUpdatedAt: timestamp,
      displayName: 'Mimi',
      shortDescription: 'Black-and-white male with chin-spot',
      metadata: { yearsRecorded: [], areasOfResidence: [], furPatterns: [] },
      photos: [licensedPhoto, secondPhoto],
      sourceActive: true,
      visible: true,
      importedAt: timestamp,
      syncedAt: timestamp,
      lastSeenRunId: 'run-1',
      moderation: { hidden: false },
      overrides: { coverPhotoId: 'inat-photo-2' },
      matchStatus: 'unlinked',
    });

    const media = importedCatalogMedia(profile);
    expect(media.map(({ id }) => id)).toEqual([
      'inat-photo-2',
      'inat-photo-1',
    ]);
    expect(media.map(({ role }) => role)).toEqual(['profile', 'gallery']);
  });

  it('rejects malformed external URLs, locations, and visibility state', () => {
    expect(() =>
      externalMediaAssetSchema.parse({
        ...licensedPhoto,
        url: 'not-a-url',
      }),
    ).toThrow();
    expect(() =>
      importedObservationSchema.parse({
        id: 1,
        uuid: 'not-a-uuid',
      }),
    ).toThrow();
    expect(() =>
      importedCatalogProfileSchema.parse({
        id: -1,
        guideId: 18800,
      }),
    ).toThrow();
  });

  it('round-trips imported Firestore timestamps without changing field names', () => {
    const codecs = createFirestoreCodecs({
      fromDate: (date: Date) => ({ iso: date.toISOString() }),
    });
    const firestoreTimestamp = { toDate: () => timestamp };
    const decoded = codecs.inaturalistObservation.decode('321', {
      schemaVersion: 1,
      uuid: 'a1d112b8-954b-4a65-a574-d73092f1cd38',
      projectId: 149475,
      sourceUrl: 'https://www.inaturalist.org/observations/321',
      sourceUpdatedAt: firestoreTimestamp,
      observedAt: firestoreTimestamp,
      observedOn: '2026-07-07',
      observedTimePrecision: 'exact',
      displayName: 'Mimi',
      description: '',
      qualityGrade: 'research',
      observer: { id: 42, login: 'observer' },
      location: null,
      positionalAccuracy: null,
      photos: [],
      sourceActive: true,
      visible: true,
      importedAt: firestoreTimestamp,
      syncedAt: firestoreTimestamp,
      lastSeenRunId: 'run-1',
      moderation: {
        hidden: true,
        reason: 'Duplicate',
        updatedBy: 'admin-1',
        updatedAt: firestoreTimestamp,
      },
    });

    expect(decoded.id).toBe(321);
    expect(decoded.moderation.updatedAt).toEqual(timestamp);
    expect(codecs.inaturalistObservation.encode(decoded)).toMatchObject({
      schemaVersion: 1,
      sourceUpdatedAt: { iso: timestamp.toISOString() },
      observedAt: { iso: timestamp.toISOString() },
      importedAt: { iso: timestamp.toISOString() },
      syncedAt: { iso: timestamp.toISOString() },
      moderation: {
        hidden: true,
        reason: 'Duplicate',
        updatedBy: 'admin-1',
        updatedAt: { iso: timestamp.toISOString() },
      },
    });
  });

  it('decodes the first running lease before source summaries exist', () => {
    const codecs = createFirestoreCodecs({ fromDate: (date: Date) => date });
    const status = codecs.inaturalistStatus.decode('inaturalist', {
      running: true,
      runId: 'run-1',
      startedAt: { toDate: () => timestamp },
    });

    expect(status).toMatchObject({
      running: true,
      runId: 'run-1',
      observations: {
        fetched: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        errors: [],
      },
      catalog: {
        fetched: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        errors: [],
      },
      ambiguousCatalogMatches: [],
    });
  });
});
