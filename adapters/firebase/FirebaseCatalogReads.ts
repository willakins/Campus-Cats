import { httpsCallable, type Functions } from 'firebase/functions';
import { z } from 'zod';
import { parseCatalogFavorite } from '../../core/domain';
import type {
  CatalogReadPort,
  CatalogPageCursor,
  DisplayMediaAsset,
} from '../../core/ports';
import {
  catalogRecordSchema,
  catalogRecord,
  catalogMediaSchema,
  catalogMedia,
  relationalDate,
} from './relationalCatalogDto';

const favoriteSchema = z.object({
  user_id: z.string().min(1),
  catalog_id: z.string().min(1),
  created_at: relationalDate,
});
const mediaSchema = catalogMediaSchema.extend({
  position: z.number().int().nonnegative(),
});
const countSchema = z.object({
  catalog_id: z.string().min(1),
  heart_count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
const pageSize = 99;

/** Existing array-returning pickers collect bounded pages; detail media never lists Storage. */
export class FirebaseCatalogReads implements CatalogReadPort {
  constructor(private readonly functions: Functions) {}
  private async read(request: Record<string, unknown>): Promise<unknown> {
    return (
      await httpsCallable<Record<string, unknown>, unknown>(
        this.functions,
        'readRelationalCore',
      )(request)
    ).data;
  }
  async get(catalogId: string) {
    const result = await this.read({ operation: 'catalogRecord', catalogId });
    return result === null
      ? undefined
      : catalogRecord(catalogRecordSchema.parse(result));
  }
  async listPage(cursor?: CatalogPageCursor) {
    const rows = z
      .array(catalogRecordSchema.extend({ sort_name: z.string() }))
      .max(pageSize + 1)
      .parse(
        await this.read({
          operation: 'catalogPage',
          limit: pageSize + 1,
          ...(cursor ? { afterName: cursor.sortName, afterId: cursor.id } : {}),
        }),
      );
    const page = rows.slice(0, pageSize),
      last = page.at(-1);
    return {
      items: page.map(catalogRecord),
      ...(rows.length > pageSize && last
        ? { nextCursor: { sortName: last.sort_name, id: last.id } }
        : {}),
    };
  }
  async media(catalogId: string) {
    const items: DisplayMediaAsset[] = [];
    const seen = new Set<string>();
    let cursor: { afterPosition: number; afterId: string } | undefined;
    do {
      const rows = z
        .array(mediaSchema)
        .max(pageSize + 1)
        .parse(
          await this.read({
            operation: 'catalogMedia',
            catalogId,
            limit: pageSize + 1,
            ...cursor,
          }),
        );
      const page = rows.slice(0, pageSize),
        last = page.at(-1);
      for (const row of page) {
        if (seen.has(row.id)) throw new Error('Repeated catalog media page');
        seen.add(row.id);
        items.push(catalogMedia(row));
      }
      cursor =
        rows.length > pageSize && last
          ? { afterPosition: last.position, afterId: last.id }
          : undefined;
    } while (cursor);
    return items;
  }
  async favoriteForUser(userId: string) {
    const result = await this.read({ operation: 'catalogFavorite', userId });
    if (result === null) return undefined;
    const row = favoriteSchema.parse(result);
    if (row.user_id !== userId) throw new Error('Unexpected favorite identity');
    return parseCatalogFavorite({
      userId: row.user_id,
      catalogId: row.catalog_id,
      createdAt: new Date(row.created_at),
    });
  }
  async favoriteSummary() {
    const counts: Record<string, number> = Object.create(null);
    const seen = new Set<string>();
    let afterId: string | undefined, selectedCatalogId: string | undefined;
    do {
      const result = z
        .object({
          items: z.array(countSchema).max(pageSize + 1),
          selected_catalog_id: z.string().nullable(),
        })
        .parse(
          await this.read({
            operation: 'catalogFavoriteCounts',
            limit: pageSize + 1,
            ...(afterId ? { afterId } : {}),
          }),
        );
      selectedCatalogId = result.selected_catalog_id ?? undefined;
      const page = result.items.slice(0, pageSize),
        last = page.at(-1);
      for (const row of page) {
        if (seen.has(row.catalog_id))
          throw new Error('Repeated favorite counts page');
        seen.add(row.catalog_id);
        counts[row.catalog_id] = row.heart_count;
      }
      afterId =
        result.items.length > pageSize && last ? last.catalog_id : undefined;
    } while (afterId);
    return { counts, selectedCatalogId };
  }
}
