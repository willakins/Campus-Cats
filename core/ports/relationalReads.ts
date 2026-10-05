import type { Coordinates, PublicProfile } from '../domain';

export interface CatalogPageCursor {
  readonly sortName: string;
  readonly id: string;
}

export interface SightingPageCursor {
  /** Preserve PostgreSQL fractional seconds verbatim when paginating. */
  readonly observedAt: string;
  readonly id: string;
}

export interface ReadPage<Item, Cursor> {
  readonly items: readonly Item[];
  readonly nextCursor?: Cursor;
}

export interface CatalogSummary {
  readonly id: string;
  readonly source: 'campus-cats' | 'inaturalist';
  readonly name: string;
  readonly descriptionShort: string;
  readonly sightingCount: number;
  readonly latestSightingAt?: Date;
  readonly heartCount: number;
  readonly linkedLocalCatalogId?: string;
}

export interface SightingSummary {
  readonly id: string;
  readonly source: 'campus-cats' | 'inaturalist';
  readonly name: string;
  readonly info: string;
  readonly observedAt: Date;
  readonly location: Coordinates | null;
}

export interface CommunitySummary {
  readonly alerts: number;
  readonly events: number;
  readonly openSurveys: number;
  readonly activeVotes: number;
}

/** Purpose-built bounded reads. Club and identity come from authenticated server context. */
export interface RelationalReadPort {
  listCatalogPage(request?: {
    readonly pageSize?: number;
    readonly cursor?: CatalogPageCursor;
  }): Promise<ReadPage<CatalogSummary, CatalogPageCursor>>;
  listSightingsInBounds(
    bounds: {
      readonly south: number;
      readonly north: number;
      readonly west: number;
      readonly east: number;
    },
    request?: {
      readonly pageSize?: number;
      readonly cursor?: SightingPageCursor;
    },
  ): Promise<ReadPage<SightingSummary, SightingPageCursor>>;
  listCatSightings(
    catalogId: string,
    request?: {
      readonly pageSize?: number;
      readonly cursor?: SightingPageCursor;
    },
  ): Promise<ReadPage<SightingSummary, SightingPageCursor>>;
  getMemberProfile(userId: string): Promise<PublicProfile | undefined>;
  getCommunitySummary(): Promise<CommunitySummary>;
}
