import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { FirebaseCatalogDiscovery } from './FirebaseCatalogDiscovery';

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
const invoke = jest.fn();
const functions = {} as Functions;
const cursor = (id: string) => ({
  id,
  name: 'alice',
  metric: null,
  sort: 'name-asc' as const,
  search: '',
  tagIds: [],
});
const row = (id: string) => ({
  id,
  source: 'campus-cats',
  source_id: null,
  name: 'Alice',
  description_short: 'Friendly',
  description_long: 'Campus cat',
  color_pattern: 'Black',
  behavior: 'Calm',
  years_recorded: '2026',
  area_of_residence: 'Campus',
  current_status: 'Feral',
  fur_length: 'Short',
  fur_pattern: 'Solid',
  tnr: 'Yes',
  sex: 'Female',
  credits: 'Club',
  created_at: '2026-10-01T00:00:00Z',
  source_url: null,
  source_updated_at: null,
  linked_local_catalog_id: null,
  match_status: null,
  source_active: true,
  visible: true,
  local_created_at: null,
  local_credits: null,
  sighting_count: 4,
  heart_count: 1,
  first_sighting_at: '2026-01-01T00:00:00Z',
  latest_sighting_at: null,
  tags: [{ id: 'feral', label: 'Feral' }],
  cover: {
    id: 'photo',
    kind: 'firebase',
    url: 'https://example.com/photo',
    role: 'profile',
    metadata: {},
  },
  cursor: cursor(id),
});
const response = (items: unknown[]) => ({
  data: {
    items,
    total: 3,
    available_tags: [{ id: 'feral', label: 'Feral' }],
    selected_catalog_id: 'a',
  },
});
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(httpsCallable)
    .mockReturnValue(Object.assign(invoke, { stream: jest.fn() }));
});

it('returns domain cards with metrics and cover references using one bounded callable', async () => {
  invoke.mockResolvedValue(response([row('a'), row('b'), row('c')]));
  const result = await new FirebaseCatalogDiscovery(functions).query({
    pageSize: 2,
  });
  expect(result.items).toHaveLength(2);
  expect(result.items[0]).toMatchObject({
    entry: { id: 'a', cat: { name: 'Alice' }, source: 'campus-cats' },
    sightingCount: 4,
    isFavorite: true,
    cover: { url: 'https://example.com/photo' },
  });
  expect(result.nextCursor).toEqual(cursor('b'));
  expect(result.total).toBe(3);
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(invoke).toHaveBeenCalledWith({
    operation: 'catalogDiscovery',
    search: '',
    sort: 'name-asc',
    tagIds: [],
    limit: 3,
  });
});
it('keeps linked imported metadata and external photo licenses', async () => {
  const imported = {
    ...row('inat-guide-123'),
    source: 'inaturalist',
    source_id: 123,
    source_url: 'https://www.inaturalist.org/guides/18800',
    source_updated_at: '2026-10-01T00:00:00Z',
    linked_local_catalog_id: 'local',
    match_status: 'linked',
    local_created_at: '2026-01-01T00:00:00Z',
    local_credits: 'Local club',
    cover: {
      id: 'inat-photo',
      kind: 'external',
      url: 'https://example.com/photo',
      role: 'profile',
      metadata: {
        thumbnailUrl: 'https://example.com/thumbnail',
        sourceUrl: 'https://www.inaturalist.org/photos/1',
        attribution: 'Photographer',
        licenseCode: 'cc-by',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      },
    },
  };
  invoke.mockResolvedValue(response([imported]));
  const page = await new FirebaseCatalogDiscovery(functions).query({});
  expect(page.items[0].entry).toMatchObject({
    source: 'inaturalist',
    sourceId: 123,
    linkedLocalCatalogId: 'local',
    localContribution: { credits: 'Local club' },
  });
  expect(page.items[0].cover).toMatchObject({
    kind: 'external',
    licenseCode: 'cc-by',
    attribution: 'Photographer',
  });
  expect(page.nextCursor).toBeUndefined();
});
it('rejects a cursor from different filters and rejects malformed cards without a second data source', async () => {
  const adapter = new FirebaseCatalogDiscovery(functions);
  await expect(
    adapter.query({ search: 'other', cursor: cursor('a') }),
  ).rejects.toThrow('Cursor');
  expect(invoke).not.toHaveBeenCalled();
  invoke.mockResolvedValue(response([{ ...row('a'), heart_count: -1 }]));
  await expect(adapter.query({})).rejects.toThrow();
});
