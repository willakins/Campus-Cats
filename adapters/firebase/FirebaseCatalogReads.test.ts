import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { FirebaseCatalogReads } from './FirebaseCatalogReads';
import { relationalCatalogRow as row } from '../../test/fixtures/relationalCatalog';

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
const invoke = jest.fn();
const adapter = new FirebaseCatalogReads({} as Functions);
const media = (id: string, position = 0) => ({
  id,
  position,
  kind: 'firebase',
  url: `https://example.com/${id}`,
  role: 'gallery',
  metadata: {},
});
beforeEach(() => {
  jest.clearAllMocks();
  invoke.mockReset();
  jest
    .mocked(httpsCallable)
    .mockReturnValue(Object.assign(invoke, { stream: jest.fn() }));
});

it('validates full records, strips private fields, and preserves not-found results', async () => {
  invoke
    .mockResolvedValueOnce({
      data: {
        ...row('local'),
        user_id: 'private',
        email: 'private@example.com',
      },
    })
    .mockResolvedValueOnce({ data: null });
  const record = await adapter.get('local');
  expect(record).toMatchObject({
    id: 'local',
    cat: { name: 'Alice' },
  });
  expect(record).not.toHaveProperty('createdBy');
  expect(record).not.toHaveProperty('email');
  await expect(adapter.get('missing')).resolves.toBeUndefined();
  expect(invoke).toHaveBeenNthCalledWith(1, {
    operation: 'catalogRecord',
    catalogId: 'local',
  });
  invoke.mockResolvedValue({
    data: { ...row('cat'), created_at: 'invalid-date' },
  });
  await expect(adapter.get('cat')).rejects.toThrow();
});

it('preserves bounded picker pages and the database sort cursor', async () => {
  invoke.mockResolvedValue({
    data: Array.from({ length: 100 }, (_, i) => ({
      ...row(`cat-${i}`),
      sort_name: `name-${i}`,
    })),
  });
  const result = await adapter.listPage();
  expect(result.items).toHaveLength(99);
  expect(result.nextCursor).toEqual({ sortName: 'name-98', id: 'cat-98' });
  await adapter.listPage(result.nextCursor);
  expect(invoke).toHaveBeenLastCalledWith({
    operation: 'catalogPage',
    limit: 100,
    afterName: 'name-98',
    afterId: 'cat-98',
  });
});

it('collects media pages using tied positions and keeps external attribution', async () => {
  invoke
    .mockResolvedValueOnce({
      data: Array.from({ length: 100 }, (_, i) => media(`photo-${i}`)),
    })
    .mockResolvedValueOnce({
      data: [
        {
          ...media('photo-99'),
          kind: 'external',
          metadata: {
            thumbnailUrl: 'https://example.com/thumb',
            sourceUrl: 'https://www.inaturalist.org/photos/1',
            attribution: 'Photographer',
            licenseCode: 'cc-by',
            licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
          },
        },
      ],
    });
  const result = await adapter.media('cat');
  expect(result).toHaveLength(100);
  expect(result.at(-1)).toMatchObject({
    kind: 'external',
    attribution: 'Photographer',
    licenseCode: 'cc-by',
    role: 'gallery',
  });
  expect(invoke).toHaveBeenNthCalledWith(2, {
    operation: 'catalogMedia',
    catalogId: 'cat',
    limit: 100,
    afterPosition: 0,
    afterId: 'photo-98',
  });
});

it('rejects repeated media pages and incomplete external licenses', async () => {
  invoke.mockResolvedValue({
    data: Array.from({ length: 100 }, (_, i) => media(`photo-${i}`)),
  });
  await expect(adapter.media('cat')).rejects.toThrow('Repeated');
  expect(invoke).toHaveBeenCalledTimes(2);
  invoke.mockResolvedValue({
    data: [{ ...media('external'), kind: 'external' }],
  });
  await expect(adapter.media('cat')).rejects.toThrow();
});

it('reads scoped favorites, validates the requested member, and collects aggregate counts safely', async () => {
  invoke.mockResolvedValueOnce({
    data: {
      user_id: 'member',
      catalog_id: 'cat',
      created_at: '2026-10-05T00:00:00Z',
    },
  });
  await expect(adapter.favoriteForUser('member')).resolves.toMatchObject({
    userId: 'member',
    catalogId: 'cat',
  });
  invoke.mockResolvedValueOnce({
    data: {
      user_id: 'wrong-member',
      catalog_id: 'cat',
      created_at: '2026-10-05T00:00:00Z',
    },
  });
  await expect(adapter.favoriteForUser('member')).rejects.toThrow('identity');
  invoke
    .mockResolvedValueOnce({
      data: {
        items: Array.from({ length: 100 }, (_, i) => ({
          catalog_id: `cat-${i}`,
          heart_count: 2,
        })),
        selected_catalog_id: 'cat-1',
      },
    })
    .mockResolvedValueOnce({
      data: {
        items: [{ catalog_id: '__proto__', heart_count: 3 }],
        selected_catalog_id: 'cat-1',
      },
    });
  const result = await adapter.favoriteSummary();
  expect(Object.keys(result.counts)).toHaveLength(100);
  expect(result.counts['__proto__']).toBe(3);
  expect(result.selectedCatalogId).toBe('cat-1');
  expect(invoke).toHaveBeenLastCalledWith({
    operation: 'catalogFavoriteCounts',
    limit: 100,
    afterId: 'cat-98',
  });
});
