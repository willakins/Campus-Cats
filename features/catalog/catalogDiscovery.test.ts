import {
  CatalogRecord,
  InaturalistSightingRecord,
  Role,
  SightingRecord,
  localCatalogRecord,
  localSightingRecord,
  parseCatalogEntry,
  parseSighting,
  parseUser,
} from '../../core/domain';
import {
  buildCatalogItems,
  filterAndSortCatalog,
  isSourceManagedCatalogEntry,
  moveCatalogFavorite,
  sightingsForCatalogEntry,
} from './catalogDiscovery';

const actor = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});

const localEntry = (
  id: string,
  name: string,
  area: string,
): CatalogRecord =>
  localCatalogRecord(
    parseCatalogEntry({
      id,
      cat: {
        name,
        descShort: `${name} is a campus cat.`,
        descLong: `Look for ${name} around ${area}.`,
        colorPattern: 'Tabby',
        behavior: 'Friendly',
        yearsRecorded: '2025–present',
        AoR: area,
        currentStatus: 'Feral',
        furLength: 'Short',
        furPattern: 'Tabby',
        tnr: 'Yes',
        sex: 'Unknown',
      },
      credits: '',
      createdAt: new Date('2025-01-01T12:00:00.000Z'),
      createdBy: actor,
    }),
  );

const localSighting = (
  id: string,
  name: string,
  date: string,
): SightingRecord =>
  localSightingRecord(
    parseSighting({
      id,
      name,
      info: '',
      fed: false,
      health: true,
      date: new Date(date),
      location: { latitude: 33.7756, longitude: -84.3963 },
      createdBy: actor,
      timeOfDay: 'Afternoon',
    }),
  );

const importedEntry: CatalogRecord = {
  source: 'inaturalist',
  id: 'inat-guide-2001',
  sourceId: 2001,
  cat: { name: 'Mimi', descShort: 'Black-and-white campus cat.' },
  credits: '',
  sourceUrl: 'https://www.inaturalist.org/guide_taxa/2001',
  sourceUpdatedAt: new Date('2025-01-01T12:00:00.000Z'),
  matchStatus: 'unlinked',
  sourceActive: true,
  visible: true,
  moderation: { hidden: false, reason: '' },
};

const importedSighting: InaturalistSightingRecord = {
  source: 'inaturalist',
  id: 'inat-observation-3001',
  sourceId: 3001,
  guideTaxonId: 2001,
  name: 'Mimi',
  info: '',
  date: new Date('2025-05-03T12:00:00.000Z'),
  observedOn: '2025-05-03',
  observedTimePrecision: 'date',
  location: { latitude: 33.7756, longitude: -84.3963 },
  qualityGrade: 'casual',
  observer: { id: 42, login: 'observer' },
  sourceUrl: 'https://www.inaturalist.org/observations/3001',
  positionalAccuracy: null,
  sourceActive: true,
  visible: true,
};

describe('catalog discovery', () => {
  const goldie = localEntry('goldie', 'Goldie', 'Library');
  const campusSightings = [
    localSighting('goldie-1', 'Goldie', '2025-05-01T12:00:00.000Z'),
    localSighting('goldie-2', 'Goldie', '2025-05-02T12:00:00.000Z'),
    importedSighting,
  ];

  it('associates both local names and iNaturalist guide IDs with profiles', () => {
    expect(sightingsForCatalogEntry(goldie, campusSightings)).toHaveLength(2);
    expect(sightingsForCatalogEntry(importedEntry, campusSightings)).toEqual([
      importedSighting,
    ]);
  });

  it('builds sighting, recency, heart, and account-favorite metrics', () => {
    const items = buildCatalogItems(
      [goldie, importedEntry],
      campusSightings,
      {
        selectedCatalogId: 'goldie',
        counts: { goldie: 4, 'inat-guide-2001': 7 },
      },
    );

    expect(items).toMatchObject([
      {
        entry: { id: 'goldie' },
        sightingCount: 2,
        heartCount: 4,
        isFavorite: true,
        mostRecentSighting: new Date('2025-05-02T12:00:00.000Z'),
      },
      {
        entry: { id: 'inat-guide-2001' },
        sightingCount: 1,
        heartCount: 7,
        isFavorite: false,
        mostRecentSighting: new Date('2025-05-03T12:00:00.000Z'),
      },
    ]);
  });

  it('moves one account heart without disturbing other accounts', () => {
    expect(
      moveCatalogFavorite(
        {
          selectedCatalogId: 'goldie',
          counts: { goldie: 3, 'inat-guide-2001': 7 },
        },
        'inat-guide-2001',
      ),
    ).toEqual({
      selectedCatalogId: 'inat-guide-2001',
      counts: { goldie: 2, 'inat-guide-2001': 8 },
    });
    expect(
      moveCatalogFavorite(
        { selectedCatalogId: 'goldie', counts: { goldie: 1 } },
        undefined,
      ),
    ).toEqual({ selectedCatalogId: undefined, counts: {} });
    expect(moveCatalogFavorite({ counts: {} }, undefined)).toEqual({
      selectedCatalogId: undefined,
      counts: {},
    });
  });

  it('includes linked local sightings in an imported profile', () => {
    const linked = { ...importedEntry, linkedLocalCatalogId: 'goldie' };
    const localMimi = localSighting(
      'mimi-local',
      'Mimi',
      '2025-05-04T12:00:00.000Z',
    );

    expect(sightingsForCatalogEntry(linked, [localMimi])).toEqual([localMimi]);
  });

  it('only source-manages imported profiles without a linked local entry', () => {
    expect(isSourceManagedCatalogEntry(importedEntry)).toBe(true);
    expect(
      isSourceManagedCatalogEntry({
        ...importedEntry,
        linkedLocalCatalogId: 'goldie',
      }),
    ).toBe(false);
    expect(isSourceManagedCatalogEntry(goldie)).toBe(false);
  });

  it('searches profile fields and supports every requested sort order', () => {
    const alex = localEntry('alex', 'Alex', 'Tech Green');
    const items = buildCatalogItems(
      [goldie, importedEntry, alex],
      campusSightings,
      {
        counts: { goldie: 4, 'inat-guide-2001': 7, alex: 1 },
      },
    );

    expect(filterAndSortCatalog(items, 'library', 'name-asc').map(({ entry }) => entry.id))
      .toEqual(['goldie']);
    expect(filterAndSortCatalog(items, '', 'name-asc').map(({ entry }) => entry.cat.name))
      .toEqual(['Alex', 'Goldie', 'Mimi']);
    expect(filterAndSortCatalog(items, '', 'name-desc').map(({ entry }) => entry.cat.name))
      .toEqual(['Mimi', 'Goldie', 'Alex']);
    expect(filterAndSortCatalog(items, '', 'sightings').map(({ entry }) => entry.id))
      .toEqual(['goldie', 'inat-guide-2001', 'alex']);
    expect(filterAndSortCatalog(items, '', 'recent').map(({ entry }) => entry.id))
      .toEqual(['inat-guide-2001', 'goldie', 'alex']);
    expect(filterAndSortCatalog(items, '', 'hearts').map(({ entry }) => entry.id))
      .toEqual(['inat-guide-2001', 'goldie', 'alex']);
  });

  it('uses deterministic name tie-breakers for equal discovery metrics', () => {
    const sameNameB = localEntry('same-b', 'Same Name', 'Library');
    const sameNameA = localEntry('same-a', 'Same Name', 'Library');
    const items = buildCatalogItems([sameNameB, sameNameA], [], { counts: {} });

    for (const sort of ['name-asc', 'sightings', 'recent', 'hearts'] as const) {
      expect(filterAndSortCatalog(items, '', sort).map(({ entry }) => entry.id))
        .toEqual(['same-a', 'same-b']);
    }
  });

  it('keeps the newest date when matches arrive newest first', () => {
    const items = buildCatalogItems(
      [localEntry('mimi', 'Mimi', 'Library')],
      [
        localSighting('new', 'Mimi', '2025-05-03T12:00:00.000Z'),
        localSighting('old', 'Mimi', '2025-05-01T12:00:00.000Z'),
      ],
      { counts: {} },
    );

    expect(items[0]?.mostRecentSighting).toEqual(
      new Date('2025-05-03T12:00:00.000Z'),
    );
  });
});
