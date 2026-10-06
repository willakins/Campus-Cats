import { StoredDocument } from './documents';

/** west > east denotes a viewport crossing the antimeridian. */
export interface MapBounds {
  readonly south: number;
  readonly north: number;
  readonly west: number;
  readonly east: number;
}
export interface SightingMapQuery {
  readonly bounds: MapBounds;
  readonly since?: Date;
  readonly cursor?: string;
}
export interface SightingMapDocumentPage {
  readonly local: readonly StoredDocument[];
  readonly imported: readonly StoredDocument[];
  readonly nextCursor?: string;
}
export interface SightingMapReader {
  page(query: SightingMapQuery): Promise<SightingMapDocumentPage>;
}
