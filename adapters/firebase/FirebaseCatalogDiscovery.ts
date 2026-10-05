import { httpsCallable, type Functions } from 'firebase/functions';
import { z } from 'zod';
import { parseCatalogTag } from '../../core/domain';
import type {
  CatalogDiscoveryPort,
  CatalogDiscoveryQuery,
  CatalogDiscoveryPage,
} from '../../core/ports';
import {
  catalogRecordSchema,
  catalogRecord,
  catalogMediaSchema,
  catalogMedia,
  relationalDate,
} from './relationalCatalogDto';

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const optionalText = z.string().nullable();
const sorts = z.enum([
  'name-asc',
  'name-desc',
  'sightings',
  'recent',
  'hearts',
]);
const cursorSchema = z.object({
  name: z.string(),
  id: z.string().min(1),
  metric: z.string().nullable(),
  sort: sorts,
  search: z.string(),
  tagIds: z.array(z.string()),
});
const rowSchema = catalogRecordSchema.extend({
  sighting_count: count,
  heart_count: count,
  first_sighting_at: relationalDate.nullable(),
  latest_sighting_at: relationalDate.nullable(),
  tags: z.array(z.object({ id: z.string(), label: z.string() })),
  cursor: cursorSchema,
  cover: catalogMediaSchema.extend({ role: z.literal('profile') }).nullable(),
});

/** Uses the server's authenticated club scope; no Supabase credentials live in the app. */
export class FirebaseCatalogDiscovery implements CatalogDiscoveryPort {
  constructor(private readonly functions: Functions) {}
  async query(request: CatalogDiscoveryQuery): Promise<CatalogDiscoveryPage> {
    const size = request.pageSize ?? 40;
    if (!Number.isInteger(size) || size < 1 || size > 99)
      throw new Error('Invalid catalog page size');
    const search = request.search ?? '',
      sort = request.sort ?? 'name-asc',
      tagIds = [...(request.tagIds ?? [])].sort();
    if (
      request.cursor &&
      (request.cursor.search !== search ||
        request.cursor.sort !== sort ||
        JSON.stringify(request.cursor.tagIds) !== JSON.stringify(tagIds))
    )
      throw new Error('Cursor does not match catalog query');
    const response = await httpsCallable<Record<string, unknown>, unknown>(
      this.functions,
      'readRelationalCore',
    )({
      operation: 'catalogDiscovery',
      search,
      sort,
      tagIds,
      limit: size + 1,
      ...(request.cursor ? { cursor: request.cursor } : {}),
    });
    const data = z
      .object({
        items: z.array(rowSchema).max(size + 1),
        total: count,
        available_tags: z.array(
          z.object({ id: z.string(), label: z.string() }),
        ),
        selected_catalog_id: optionalText,
      })
      .parse(response.data);
    const rows = data.items.slice(0, size),
      last = rows.at(-1);
    return {
      total: data.total,
      availableTags: data.available_tags.map(parseCatalogTag),
      selectedCatalogId: data.selected_catalog_id ?? undefined,
      items: rows.map((row) => ({
        entry: catalogRecord(row),
        sightingCount: row.sighting_count,
        heartCount: row.heart_count,
        firstSighting: row.first_sighting_at
          ? new Date(row.first_sighting_at)
          : undefined,
        mostRecentSighting: row.latest_sighting_at
          ? new Date(row.latest_sighting_at)
          : undefined,
        isFavorite: row.id === data.selected_catalog_id,
        tags: row.tags.map(parseCatalogTag),
        cover: row.cover ? catalogMedia(row.cover) : null,
      })),
      ...(data.items.length > size && last ? { nextCursor: last.cursor } : {}),
    };
  }
}
