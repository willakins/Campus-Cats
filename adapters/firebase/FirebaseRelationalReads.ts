import { Functions, httpsCallable } from 'firebase/functions';
import { z } from 'zod';
import { parsePublicProfile } from '../../core/domain';
import type {
  CatalogPageCursor,
  CatalogSummary,
  CommunitySummary,
  ReadPage,
  RelationalReadPort,
  SightingPageCursor,
  SightingSummary,
} from '../../core/ports';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const date = z.string().refine((value) => !Number.isNaN(Date.parse(value)));
const catalogRow = z.object({
  id: z.string().min(1),
  source: z.enum(['campus-cats', 'inaturalist']),
  name: z.string(),
  description_short: z.string(),
  sort_name: z.string(),
  sighting_count: count,
  heart_count: count,
  latest_sighting_at: date.nullable(),
  linked_local_catalog_id: z.string().nullable(),
});
const sightingRow = z
  .object({
    id: z.string().min(1),
    source: z.enum(['campus-cats', 'inaturalist']),
    reported_name: z.string(),
    info: z.string(),
    observed_at: date,
    latitude: z.number().finite().min(-90).max(90).nullable(),
    longitude: z.number().finite().min(-180).max(180).nullable(),
  })
  .refine((row) => (row.latitude === null) === (row.longitude === null));

const pageSize = (value: number | undefined, maximum: number): number => {
  const size = value ?? 40;
  if (!Number.isInteger(size) || size < 1 || size >= maximum)
    throw new Error(`Page size must be between 1 and ${maximum - 1}`);
  return size;
};

/** Staged adapter: not selected by production composition until domain cutover. */
export class FirebaseRelationalReads implements RelationalReadPort {
  constructor(private readonly functions: Functions) {}

  private async read(request: Record<string, unknown>): Promise<unknown> {
    const response = await httpsCallable<Record<string, unknown>, unknown>(
      this.functions,
      'readRelationalCore',
    )(request);
    return response.data;
  }

  async listCatalogPage(
    request: { pageSize?: number; cursor?: CatalogPageCursor } = {},
  ): Promise<ReadPage<CatalogSummary, CatalogPageCursor>> {
    const size = pageSize(request.pageSize, 100);
    const rows = z
      .array(catalogRow)
      .max(size + 1)
      .parse(
        await this.read({
          operation: 'catalogPage',
          limit: size + 1,
          ...(request.cursor
            ? { afterName: request.cursor.sortName, afterId: request.cursor.id }
            : {}),
        }),
      );
    const page = rows.slice(0, size);
    const last = page.at(-1);
    return {
      items: page.map((row) => ({
        id: row.id,
        source: row.source,
        name: row.name,
        descriptionShort: row.description_short,
        sightingCount: row.sighting_count,
        latestSightingAt: row.latest_sighting_at
          ? new Date(row.latest_sighting_at)
          : undefined,
        heartCount: row.heart_count,
        linkedLocalCatalogId: row.linked_local_catalog_id ?? undefined,
      })),
      ...(rows.length > size && last
        ? { nextCursor: { sortName: last.sort_name, id: last.id } }
        : {}),
    };
  }

  async listSightingsInBounds(
    bounds: { south: number; north: number; west: number; east: number },
    request: { pageSize?: number; cursor?: SightingPageCursor } = {},
  ): Promise<ReadPage<SightingSummary, SightingPageCursor>> {
    const size = pageSize(request.pageSize, 200);
    return this.sightingsPage(
      { operation: 'sightingsInBounds', ...bounds },
      request.cursor,
      size,
    );
  }

  async listCatSightings(
    catalogId: string,
    request: { pageSize?: number; cursor?: SightingPageCursor } = {},
  ): Promise<ReadPage<SightingSummary, SightingPageCursor>> {
    const size = pageSize(request.pageSize, 100);
    return this.sightingsPage(
      { operation: 'catSightings', catalogId },
      request.cursor,
      size,
    );
  }

  private async sightingsPage(
    parameters: Record<string, unknown>,
    cursor: SightingPageCursor | undefined,
    size: number,
  ): Promise<ReadPage<SightingSummary, SightingPageCursor>> {
    const rows = z
      .array(sightingRow)
      .max(size + 1)
      .parse(
        await this.read({
          ...parameters,
          limit: size + 1,
          ...(cursor
            ? { beforeDate: cursor.observedAt, beforeId: cursor.id }
            : {}),
        }),
      );
    const page = rows.slice(0, size),
      last = page.at(-1);
    return {
      items: page.map((row) => ({
        id: row.id,
        source: row.source,
        name: row.reported_name,
        info: row.info,
        observedAt: new Date(row.observed_at),
        location:
          row.latitude !== null && row.longitude !== null
            ? { latitude: row.latitude, longitude: row.longitude }
            : null,
      })),
      ...(rows.length > size && last
        ? { nextCursor: { observedAt: last.observed_at, id: last.id } }
        : {}),
    };
  }

  async getMemberProfile(userId: string) {
    const value = await this.read({ operation: 'memberProfile', userId });
    if (value === null) return undefined;
    const row = z
      .object({
        user_id: z.string(),
        display_name: z.string(),
        bio: z.string(),
        profile_photo_url: z.string(),
        role: z.number(),
        achievement_ids: z.array(z.string()),
        selected_title_id: z.string().nullable(),
      })
      .parse(value);
    if (row.user_id !== userId)
      throw new Error('Member profile identity mismatch');
    return parsePublicProfile({
      id: row.user_id,
      displayName: row.display_name,
      bio: row.bio,
      profilePhotoUrl: row.profile_photo_url,
      role: row.role,
      achievementIds: row.achievement_ids,
      selectedTitleId: row.selected_title_id ?? '',
    });
  }

  async getCommunitySummary(): Promise<CommunitySummary> {
    const row = z
      .object({
        alerts: count,
        events: count,
        open_surveys: count,
        active_votes: count,
      })
      .parse(await this.read({ operation: 'communitySummary' }));
    return {
      alerts: row.alerts,
      events: row.events,
      openSurveys: row.open_surveys,
      activeVotes: row.active_votes,
    };
  }
}
