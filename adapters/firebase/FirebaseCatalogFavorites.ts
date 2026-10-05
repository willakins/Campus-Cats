import { httpsCallable, type Functions } from 'firebase/functions';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { parseCatalogFavorite } from '../../core/domain';
import type { CatalogFavoritePort } from '../../core/ports';

const resultSchema = z.object({
  user_id: z.string().min(1),
  catalog_id: z.string().min(1),
  created_at: z.string().refine((value) => Number.isFinite(Date.parse(value))),
});
export class FirebaseCatalogFavorites implements CatalogFavoritePort {
  constructor(
    private readonly functions: Functions,
    private readonly operationId: () => string = uuid,
  ) {}
  async setFavorite(catalogId: string | undefined) {
    const invoke = httpsCallable<Record<string, unknown>, unknown>(
      this.functions,
      'mutateRelationalCore',
    );
    const request = {
      operation: 'setCatalogFavorite',
      operationId: this.operationId(),
      catalogId: catalogId ?? null,
    };
    let response;
    try {
      response = await invoke(request);
    } catch (error) {
      // A response may be lost after commit; retry that operation ID, never a new mutation.
      if (
        !['functions/unavailable', 'functions/deadline-exceeded'].includes(
          (error as { code?: string }).code ?? '',
        )
      )
        throw error;
      response = await invoke(request);
    }
    if (response.data === null) return undefined;
    const row = resultSchema.parse(response.data);
    return parseCatalogFavorite({
      userId: row.user_id,
      catalogId: row.catalog_id,
      createdAt: new Date(row.created_at),
    });
  }
}
