/** Staged server gateway. Register a callable only after hosted configuration and parity checks. */
export type RelationalReadRequest =
  | { operation: 'catalogRecord'; catalogId: string }
  | {
      operation: 'catalogMedia';
      catalogId: string;
      limit?: number;
      afterPosition?: number;
      afterId?: string;
    }
  | { operation: 'catalogFavorite'; userId: string }
  | { operation: 'catalogFavoriteCounts'; limit?: number; afterId?: string }
  | {
      operation: 'catalogDiscovery';
      search?: string;
      sort?: string;
      tagIds?: string[];
      cursor?: Record<string, unknown>;
      limit?: number;
    }
  | {
      operation: 'catalogPage';
      limit?: number;
      afterName?: string;
      afterId?: string;
    }
  | {
      operation: 'sightingsInBounds';
      south: number;
      north: number;
      west: number;
      east: number;
      limit?: number;
      beforeDate?: string;
      beforeId?: string;
    }
  | {
      operation: 'catSightings';
      catalogId: string;
      limit?: number;
      beforeDate?: string;
      beforeId?: string;
    }
  | { operation: 'memberProfile'; userId: string }
  | { operation: 'communitySummary' };

export interface LiveMemberAccess {
  clubId: string;
  firebaseProjectId: string;
  role: number;
  banned: boolean;
  authDisabled: boolean;
  clubAccessEnabled: boolean;
}

export interface ReadGatewayDependencies {
  enabled: boolean;
  firebaseProjectId: string;
  authorizeLive: (uid: string) => Promise<LiveMemberAccess | undefined>;
  rpc: (name: string, parameters: Record<string, unknown>) => Promise<unknown>;
}

export class RelationalReadError extends Error {
  constructor(
    readonly code:
      | 'unauthenticated'
      | 'permission-denied'
      | 'failed-precondition'
      | 'invalid-argument',
    message: string,
  ) {
    super(message);
  }
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 200)
    throw new RelationalReadError('invalid-argument', `Invalid ${name}`);
  return value;
}

// Legacy Firestore documents allow names much longer than IDs. Preserve SQL sort
// keys verbatim, including empty names, within the source document size ceiling.
const maxCatalogNameCursorLength = 1024 * 1024;
function catalogNameCursor(value: unknown): string {
  if (typeof value !== 'string' || value.length > maxCatalogNameCursorLength)
    throw new RelationalReadError(
      'invalid-argument',
      'Invalid catalog name cursor',
    );
  return value;
}

function pageParameters(data: Record<string, unknown>, max: number) {
  const limit = data.limit ?? Math.min(40, max);
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > max
  )
    throw new RelationalReadError('invalid-argument', 'Invalid page limit');
  return { p_limit: limit };
}

function dateCursor(data: Record<string, unknown>) {
  if (data.beforeDate === undefined && data.beforeId === undefined) return {};
  const value = text(data.beforeDate, 'cursor date');
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value)))
    throw new RelationalReadError('invalid-argument', 'Invalid cursor date');
  return {
    p_before_date: value,
    p_before_id: text(data.beforeId, 'cursor ID'),
  };
}

export async function authorizeRelationalMember(
  uid: string | undefined,
  dependencies: ReadGatewayDependencies,
): Promise<LiveMemberAccess> {
  if (!uid)
    throw new RelationalReadError('unauthenticated', 'Sign in to continue');
  if (!dependencies.enabled)
    throw new RelationalReadError(
      'failed-precondition',
      'Relational reads are not enabled',
    );
  // Caller cannot choose a club. This must check live Firebase Auth, users, and club entitlement.
  const access = await dependencies.authorizeLive(uid);
  if (
    !access ||
    access.banned ||
    access.authDisabled ||
    !access.clubAccessEnabled ||
    access.firebaseProjectId !== dependencies.firebaseProjectId ||
    !Number.isInteger(access.role) ||
    access.role < 0 ||
    access.role > 4
  ) {
    throw new RelationalReadError(
      'permission-denied',
      'Club access is unavailable',
    );
  }
  return access;
}

export async function readRelationalCore(
  uid: string | undefined,
  input: unknown,
  dependencies: ReadGatewayDependencies,
): Promise<unknown> {
  const access = await authorizeRelationalMember(uid, dependencies);
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new RelationalReadError('invalid-argument', 'Invalid read request');
  const data = input as Record<string, unknown>;
  const parameters: Record<string, unknown> = {
    p_club: access.clubId,
    p_project: dependencies.firebaseProjectId,
  };
  let name: string;
  switch (data.operation) {
    case 'catalogRecord':
      name = 'cc_catalog_record';
      parameters.p_catalog_id = text(data.catalogId, 'catalog ID');
      break;
    case 'catalogMedia':
      name = 'cc_catalog_media_page';
      parameters.p_catalog_id = text(data.catalogId, 'catalog ID');
      Object.assign(parameters, pageParameters(data, 100));
      if (data.afterPosition !== undefined || data.afterId !== undefined) {
        if (
          !Number.isSafeInteger(data.afterPosition) ||
          (data.afterPosition as number) < 0 ||
          (data.afterPosition as number) > 2147483647
        )
          throw new RelationalReadError(
            'invalid-argument',
            'Invalid media cursor',
          );
        parameters.p_after_position = data.afterPosition;
        parameters.p_after_id = text(data.afterId, 'media cursor ID');
      }
      break;
    case 'catalogFavorite':
      name = 'cc_catalog_favorite';
      parameters.p_user_id = text(data.userId, 'member ID');
      break;
    case 'catalogFavoriteCounts':
      name = 'cc_catalog_favorite_counts';
      parameters.p_user_id = uid;
      Object.assign(parameters, pageParameters(data, 100));
      if (data.afterId !== undefined)
        parameters.p_after_id = text(data.afterId, 'favorite cursor ID');
      break;
    case 'catalogDiscovery': {
      name = 'cc_catalog_discovery';
      parameters.p_user_id = uid;
      const search = data.search ?? '';
      const sort = data.sort ?? 'name-asc';
      const tags = data.tagIds ?? [];
      if (
        typeof search !== 'string' ||
        search.length > 200 ||
        typeof sort !== 'string' ||
        !['name-asc', 'name-desc', 'sightings', 'recent', 'hearts'].includes(
          sort,
        ) ||
        !Array.isArray(tags) ||
        tags.length > 50 ||
        tags.some((tag) => typeof tag !== 'string' || !tag || tag.length > 200)
      )
        throw new RelationalReadError(
          'invalid-argument',
          'Invalid catalog query',
        );
      const sortedTags = [...new Set(tags)].sort();
      Object.assign(
        parameters,
        { p_search: search, p_sort: sort, p_tag_ids: sortedTags },
        pageParameters(data, 100),
      );
      if (data.cursor !== undefined) {
        if (
          !data.cursor ||
          typeof data.cursor !== 'object' ||
          Array.isArray(data.cursor)
        )
          throw new RelationalReadError(
            'invalid-argument',
            'Invalid catalog cursor',
          );
        const cursor = data.cursor as Record<string, unknown>;
        if (
          typeof cursor.name !== 'string' ||
          cursor.name.length > maxCatalogNameCursorLength ||
          typeof cursor.id !== 'string' ||
          !cursor.id ||
          cursor.id.length > 200 ||
          !(
            cursor.metric === null ||
            (typeof cursor.metric === 'string' &&
              /^-?\d+(\.\d+)?$/.test(cursor.metric) &&
              cursor.metric.length < 40)
          ) ||
          cursor.sort !== sort ||
          cursor.search !== search ||
          JSON.stringify(cursor.tagIds) !== JSON.stringify(sortedTags)
        )
          throw new RelationalReadError(
            'invalid-argument',
            'Cursor does not match catalog query',
          );
        parameters.p_after = {
          name: cursor.name,
          id: cursor.id,
          metric: cursor.metric,
          sort,
          search,
          tagIds: sortedTags,
        };
      }
      break;
    }
    case 'catalogPage':
      name = 'cc_catalog_page';
      Object.assign(parameters, pageParameters(data, 100));
      if (data.afterName !== undefined || data.afterId !== undefined) {
        // Use the database-returned sort key verbatim; JS and SQL locales may differ.
        parameters.p_after_name = catalogNameCursor(data.afterName);
        parameters.p_after_id = text(data.afterId, 'cursor ID');
      }
      break;
    case 'sightingsInBounds': {
      name = 'cc_sightings_in_bounds';
      for (const [field, maximum] of [
        ['south', 90],
        ['north', 90],
        ['west', 180],
        ['east', 180],
      ] as const) {
        const value = data[field];
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          Math.abs(value) > maximum
        )
          throw new RelationalReadError(
            'invalid-argument',
            'Invalid map bounds',
          );
        parameters[`p_${field}`] = value;
      }
      if ((data.south as number) > (data.north as number))
        throw new RelationalReadError(
          'invalid-argument',
          'Invalid map latitude order',
        );
      Object.assign(parameters, pageParameters(data, 200), dateCursor(data));
      break;
    }
    case 'catSightings':
      name = 'cc_cat_sightings';
      parameters.p_catalog_id = text(data.catalogId, 'catalog ID');
      Object.assign(parameters, pageParameters(data, 100), dateCursor(data));
      break;
    case 'memberProfile':
      name = 'cc_member_profile';
      parameters.p_user_id = text(data.userId, 'member ID');
      break;
    case 'communitySummary':
      name = 'cc_community_summary';
      break;
    default:
      throw new RelationalReadError(
        'invalid-argument',
        'Unsupported read operation',
      );
  }
  return dependencies.rpc(name, parameters);
}

export class SupabaseRpcError extends Error {
  constructor(
    readonly code:
      'permission-denied' | 'failed-precondition' | 'invalid-argument',
    message: string,
  ) {
    super(message);
  }
}

export function createSupabaseRpc(url: string, secretKey: string) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('Expected a hosted Supabase project URL');
  }
  if (!secretKey.startsWith('sb_secret_'))
    throw new Error('Expected a Supabase server secret key');
  const allowed = new Set([
    'cc_catalog_record',
    'cc_catalog_media_page',
    'cc_catalog_favorite',
    'cc_catalog_favorite_counts',
    'cc_set_catalog_favorite',
    'cc_catalog_discovery',
    'cc_catalog_page',
    'cc_sightings_in_bounds',
    'cc_cat_sightings',
    'cc_member_profile',
    'cc_community_summary',
  ]);
  return async (
    name: string,
    parameters: Record<string, unknown>,
  ): Promise<unknown> => {
    if (!allowed.has(name)) throw new Error('Unsupported RPC');
    const response = await fetch(new URL(`/rest/v1/rpc/${name}`, parsed), {
      method: 'POST',
      headers: { apikey: secretKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(parameters),
      signal: AbortSignal.timeout(10000),
    });
    // Never return upstream error bodies: they can contain SQL details or private data.
    if (!response.ok) {
      // Translate only known SQL codes; never propagate messages, details or hints.
      const body = (await response.json().catch(() => null)) as {
        code?: unknown;
      } | null;
      if (body?.code === '55000')
        throw new SupabaseRpcError(
          'failed-precondition',
          'Database updates are temporarily unavailable',
        );
      if (body?.code === '42501')
        throw new SupabaseRpcError(
          'permission-denied',
          'Database access is unavailable',
        );
      if (body?.code === '22023')
        throw new SupabaseRpcError(
          'invalid-argument',
          'The request could not be accepted',
        );
      throw new Error(`Relational request failed (${response.status})`);
    }
    return response.json();
  };
}
