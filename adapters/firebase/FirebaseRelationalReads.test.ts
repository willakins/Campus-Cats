import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { FirebaseRelationalReads } from './FirebaseRelationalReads';

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
const invoke = jest.fn();
const functions = {} as Functions;
const catalog = (id: string) => ({
  id,
  source: 'campus-cats',
  name: 'Cat',
  description_short: 'Description',
  sort_name: 'cat',
  sighting_count: 2,
  heart_count: 0,
  latest_sighting_at: null,
  linked_local_catalog_id: null,
});
const sighting = (id: string) => ({
  id,
  source: 'campus-cats',
  reported_name: 'Cat',
  info: '',
  observed_at: '2026-10-02T12:00:00.123456+00:00',
  latitude: 33,
  longitude: -84,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(httpsCallable)
    .mockReturnValue(Object.assign(invoke, { stream: jest.fn() }));
});

it('loads one bounded page and sends only the database cursor, never a client club', async () => {
  invoke.mockResolvedValue({
    data: [catalog('1'), catalog('2'), catalog('3')],
  });
  const adapter = new FirebaseRelationalReads(functions);
  const result = await adapter.listCatalogPage({ pageSize: 2 });
  expect(result.items).toHaveLength(2);
  expect(result.nextCursor).toEqual({ id: '2', sortName: 'cat' });
  await adapter.listCatalogPage({ pageSize: 2, cursor: result.nextCursor });
  expect(invoke).toHaveBeenLastCalledWith({
    operation: 'catalogPage',
    limit: 3,
    afterName: 'cat',
    afterId: '2',
  });
  expect(httpsCallable).toHaveBeenCalledWith(functions, 'readRelationalCore');
});

it('preserves microseconds in sighting cursors and stops pagination at the end', async () => {
  invoke
    .mockResolvedValueOnce({ data: [sighting('1'), sighting('2')] })
    .mockResolvedValueOnce({ data: [] });
  const adapter = new FirebaseRelationalReads(functions);
  const first = await adapter.listCatSightings('cat', { pageSize: 1 });
  expect(first.nextCursor?.observedAt).toBe('2026-10-02T12:00:00.123456+00:00');
  const next = await adapter.listCatSightings('cat', {
    pageSize: 1,
    cursor: first.nextCursor,
  });
  expect(next.nextCursor).toBeUndefined();
  expect(invoke).toHaveBeenLastCalledWith({
    operation: 'catSightings',
    catalogId: 'cat',
    limit: 2,
    beforeDate: '2026-10-02T12:00:00.123456+00:00',
    beforeId: '1',
  });
});

it('rejects excessive pages, malformed rows and mismatched profile identities', async () => {
  const adapter = new FirebaseRelationalReads(functions);
  await expect(adapter.listCatalogPage({ pageSize: 100 })).rejects.toThrow(
    'Page size',
  );
  expect(invoke).not.toHaveBeenCalled();
  invoke.mockResolvedValue({ data: [{ ...sighting('1'), longitude: null }] });
  await expect(adapter.listCatSightings('cat')).rejects.toThrow();
  invoke.mockResolvedValue({
    data: {
      user_id: 'other',
      display_name: 'Member',
      bio: '',
      profile_photo_url: '',
      role: 0,
      achievement_ids: [],
      selected_title_id: null,
    },
  });
  await expect(adapter.getMemberProfile('requested')).rejects.toThrow(
    'identity mismatch',
  );
});

it('returns absent profiles and decoded community counts', async () => {
  invoke.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({
    data: { alerts: 3, events: 0, open_surveys: 1, active_votes: 2 },
  });
  const adapter = new FirebaseRelationalReads(functions);
  await expect(adapter.getMemberProfile('member')).resolves.toBeUndefined();
  await expect(adapter.getCommunitySummary()).resolves.toEqual({
    alerts: 3,
    events: 0,
    openSurveys: 1,
    activeVotes: 2,
  });
});
