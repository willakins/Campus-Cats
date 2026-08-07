import {
  Cat,
  CatalogRecord,
  CatalogTag,
  CatalogTagAssignment,
  SightingRecord,
} from '../../core/domain';

export type CatalogSort =
  | 'name-asc'
  | 'name-desc'
  | 'sightings'
  | 'recent'
  | 'hearts';

export interface CatalogSortOption {
  readonly value: CatalogSort;
  readonly label: string;
}

export const catalogSortOptions: readonly CatalogSortOption[] = [
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'sightings', label: 'Most sightings' },
  { value: 'recent', label: 'Most recent sighting' },
  { value: 'hearts', label: 'Most hearts' },
];

export function isSourceManagedCatalogEntry(entry: CatalogRecord): boolean {
  return (
    entry.source === 'inaturalist' && entry.linkedLocalCatalogId === undefined
  );
}

export interface CatalogFavoriteSummary {
  readonly selectedCatalogId?: string;
  readonly counts: Readonly<Record<string, number>>;
}

export interface CatalogListItem {
  readonly entry: CatalogRecord;
  readonly sightingCount: number;
  readonly mostRecentSighting?: Date;
  readonly heartCount: number;
  readonly isFavorite: boolean;
  readonly tags: readonly CatalogTag[];
}

export function moveCatalogFavorite(
  current: CatalogFavoriteSummary,
  nextCatalogId: string | undefined,
): CatalogFavoriteSummary {
  const counts = { ...current.counts };
  if (current.selectedCatalogId) {
    const previousCount = (counts[current.selectedCatalogId] ?? 1) - 1;
    if (previousCount > 0) counts[current.selectedCatalogId] = previousCount;
    else delete counts[current.selectedCatalogId];
  }
  if (nextCatalogId) counts[nextCatalogId] = (counts[nextCatalogId] ?? 0) + 1;
  return { selectedCatalogId: nextCatalogId, counts };
}

export function sightingsForCatalogEntry(
  entry: CatalogRecord,
  sightings: readonly SightingRecord[],
): readonly SightingRecord[] {
  return sightings.filter((sighting) => {
    if (entry.source === 'inaturalist') {
      if (
        sighting.source === 'inaturalist' &&
        sighting.guideTaxonId === entry.sourceId
      ) {
        return true;
      }
      return (
        entry.linkedLocalCatalogId !== undefined &&
        sighting.source === 'campus-cats' &&
        sighting.name === entry.cat.name
      );
    }
    return sighting.source === 'campus-cats' && sighting.name === entry.cat.name;
  });
}

export function buildCatalogItems(
  entries: readonly CatalogRecord[],
  sightings: readonly SightingRecord[],
  favorites: CatalogFavoriteSummary,
  configuredTags: readonly CatalogTag[] = [],
  assignments: readonly CatalogTagAssignment[] = [],
): readonly CatalogListItem[] {
  const assignmentByCatalogId = new Map<string, CatalogTagAssignment>(
    assignments.map((assignment) => [assignment.catalogId, assignment]),
  );
  return entries.map((entry) => {
    const matchingSightings = sightingsForCatalogEntry(entry, sightings);
    const mostRecentSighting = matchingSightings.reduce<Date | undefined>(
      (latest, sighting) =>
        !latest || sighting.date.getTime() > latest.getTime()
          ? sighting.date
          : latest,
      undefined,
    );
    return {
      entry,
      sightingCount: matchingSightings.length,
      mostRecentSighting,
      heartCount: favorites.counts[entry.id] ?? 0,
      isFavorite: favorites.selectedCatalogId === entry.id,
      tags: catalogTagsForEntry(
        entry,
        configuredTags,
        assignmentByCatalogId.get(entry.id),
      ),
    };
  });
}

export function filterAndSortCatalog(
  items: readonly CatalogListItem[],
  search: string,
  sort: CatalogSort,
  selectedTagIds: readonly string[] = [],
): readonly CatalogListItem[] {
  const query = search.trim().toLocaleLowerCase();
  const searchFiltered = query
    ? items.filter(({ entry, tags }) =>
        searchableProfile(entry, tags).includes(query),
      )
    : items;
  const filtered = selectedTagIds.length
    ? searchFiltered.filter(({ tags }) => {
        const entryTagIds = new Set<string>(tags.map(({ id }) => id));
        return selectedTagIds.every((tagId) => entryTagIds.has(tagId));
      })
    : searchFiltered;

  return [...filtered].sort((left, right) => {
    const tieBreak = compareNames(left, right);
    switch (sort) {
      case 'name-desc':
        return -tieBreak;
      case 'sightings':
        return right.sightingCount - left.sightingCount || tieBreak;
      case 'recent':
        return compareRecent(left.mostRecentSighting, right.mostRecentSighting) || tieBreak;
      case 'hearts':
        return right.heartCount - left.heartCount || tieBreak;
      case 'name-asc':
      default:
        return tieBreak;
    }
  });
}

export function catalogTagsForEntry(
  entry: CatalogRecord,
  configuredTags: readonly CatalogTag[],
  assignment?: CatalogTagAssignment,
): readonly CatalogTag[] {
  const selectedIds = new Set<string>(
    assignment?.tagIds ?? defaultCatalogTagIdsForEntry(entry),
  );
  return configuredTags.filter(({ id }) => selectedIds.has(id));
}

export function defaultCatalogTagIdsForEntry(
  entry: CatalogRecord,
): readonly string[] {
  return defaultCatalogTagIdsForCat(entry.cat);
}

export function defaultCatalogTagIdsForCat(cat: Readonly<{
  currentStatus?: Cat['currentStatus'];
  tnr?: Cat['tnr'];
  sex?: Cat['sex'];
  furLength?: Cat['furLength'];
}>): readonly string[] {
  const tags = new Set<string>();
  const { currentStatus, tnr, sex, furLength } = cat;

  if (currentStatus === 'Adopted') tags.add('adopted');
  else if (currentStatus === 'Feral') tags.add('feral');
  else if (currentStatus === 'Frat Cat') tags.add('frat-cat');
  else if (currentStatus === 'Deceased') tags.add('deceased');

  if (tnr === 'Yes') tags.add('tnr-complete');
  else if (tnr === 'No') tags.add('needs-tnr');

  if (sex === 'Female') tags.add('female');
  else if (sex === 'Male') tags.add('male');

  if (furLength === 'Short') tags.add('short-hair');
  else if (furLength === 'Medium') tags.add('medium-hair');
  else if (furLength === 'Long') tags.add('long-hair');

  return [...tags];
}

function searchableProfile(
  entry: CatalogRecord,
  tags: readonly CatalogTag[],
): string {
  const fields = [
    entry.cat.name,
    entry.cat.descShort,
    entry.cat.descLong,
    entry.cat.colorPattern,
    entry.cat.behavior,
    entry.cat.yearsRecorded,
    entry.cat.AoR,
    entry.cat.currentStatus,
    entry.cat.furLength,
    entry.cat.furPattern,
    entry.cat.tnr,
    entry.cat.sex,
    ...tags.map(({ label }) => label),
  ];
  return fields.filter(Boolean).join(' ').toLocaleLowerCase();
}

function compareNames(left: CatalogListItem, right: CatalogListItem): number {
  return (
    left.entry.cat.name.localeCompare(right.entry.cat.name, undefined, {
      sensitivity: 'base',
    }) || left.entry.id.localeCompare(right.entry.id)
  );
}

function compareRecent(left?: Date, right?: Date): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.getTime() - left.getTime();
}
