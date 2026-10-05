import type { CatalogRecord, CatalogTag, CatalogFavorite } from '../domain';
import type { DisplayMediaAsset } from './media';
import type { CatalogPageCursor, ReadPage } from './relationalReads';

export type CatalogDiscoverySort =
  'name-asc' | 'name-desc' | 'sightings' | 'recent' | 'hearts';
export interface CatalogDiscoveryCursor {
  readonly name: string;
  readonly id: string;
  readonly metric: string | null;
  readonly sort: CatalogDiscoverySort;
  readonly search: string;
  readonly tagIds: readonly string[];
}
export interface CatalogDiscoveryQuery {
  readonly search?: string;
  readonly sort?: CatalogDiscoverySort;
  readonly tagIds?: readonly string[];
  readonly pageSize?: number;
  readonly cursor?: CatalogDiscoveryCursor;
}
export interface CatalogDiscoveryCard {
  readonly entry: CatalogRecord;
  readonly sightingCount: number;
  readonly mostRecentSighting?: Date;
  readonly firstSighting?: Date;
  readonly heartCount: number;
  readonly isFavorite: boolean;
  readonly tags: readonly CatalogTag[];
  /** Null means the query checked and found no cover; no Storage listing is needed. */
  readonly cover?: DisplayMediaAsset | null;
}
export interface CatalogDiscoveryPage {
  readonly items: readonly CatalogDiscoveryCard[];
  readonly total: number;
  readonly availableTags: readonly CatalogTag[];
  readonly selectedCatalogId?: string;
  readonly nextCursor?: CatalogDiscoveryCursor;
}
export interface CatalogDiscoveryPort {
  query(request: CatalogDiscoveryQuery): Promise<CatalogDiscoveryPage>;
}

export interface CatalogFavoritePort {
  setFavorite(
    catalogId: string | undefined,
  ): Promise<CatalogFavorite | undefined>;
}

/** Detail and picker reads share the same authoritative catalog as discovery. */
export interface CatalogReadPort {
  get(catalogId: string): Promise<CatalogRecord | undefined>;
  listPage(
    cursor?: CatalogPageCursor,
  ): Promise<ReadPage<CatalogRecord, CatalogPageCursor>>;
  media(catalogId: string): Promise<readonly DisplayMediaAsset[]>;
  favoriteForUser(userId: string): Promise<CatalogFavorite | undefined>;
  favoriteSummary(): Promise<{
    readonly selectedCatalogId?: string;
    readonly counts: Readonly<Record<string, number>>;
  }>;
}

/** Readers and their connected writer are selected together. */
export interface RelationalCatalogBackend {
  readonly discovery: CatalogDiscoveryPort;
  readonly favorites: CatalogFavoritePort;
  readonly reads: CatalogReadPort;
}
