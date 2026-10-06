import { Timestamp } from 'firebase/firestore';
import { FirebaseSightingMapReader } from './FirebaseSightingMapReader';
import { FirebaseTenantScope } from './FirebaseTenantScope';

const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  Timestamp: class {
    constructor(seconds: number, nanoseconds: number) {
      Object.assign(this, { seconds, nanoseconds });
    }
    static fromMillis(value: number) {
      return new this(Math.floor(value / 1000), (value % 1000) * 1000000);
    }
    static fromDate(value: Date) {
      return this.fromMillis(value.getTime());
    }
  },
  collection: (_db: unknown, path: string) => ({ path }),
  query: (reference: unknown, ...constraints: unknown[]) => ({
    reference,
    constraints,
  }),
  where: (...args: unknown[]) => ({ where: args }),
  orderBy: (...args: unknown[]) => ({ orderBy: args }),
  documentId: () => '__name__',
  limit: (count: number) => ({ limit: count }),
  startAfter: (...args: unknown[]) => ({ startAfter: args }),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));
const bounds = { south: -10, north: 10, west: 170, east: -170 };
const makeDoc = (id: string) => ({
  id,
  data: () => ({ name: id }),
  get: (field: string) =>
    field === 'location.latitude'
      ? 1
      : field === 'location.longitude'
        ? 175
        : Timestamp.fromMillis(1000),
});
const makeReader = () => {
  const tenant = new FirebaseTenantScope();
  tenant.setAuthenticatedClub('club-one');
  return {
    tenant,
    reader: new FirebaseSightingMapReader(
      {} as never,
      tenant,
      () => 'member-one',
    ),
  };
};
describe('bounded map reads', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });
  it('splits antimeridian bounds, filters dates and public imports, and limits every query', async () => {
    const since = new Date(1000);
    await makeReader().reader.page({ bounds, since });
    expect(mockGetDocs).toHaveBeenCalledTimes(4);
    const queries = mockGetDocs.mock.calls.map(([query]) => query);
    for (const query of queries) {
      expect(query.reference.path).toMatch(/^clubs\/club-one\//);
      expect(query.constraints).toEqual(
        expect.arrayContaining([
          { where: ['location.latitude', '>=', -10] },
          { where: ['location.latitude', '<=', 10] },
          { limit: 101 },
        ]),
      );
    }
    expect(queries[0].constraints).toContainEqual({
      where: ['location.longitude', '>=', 170],
    });
    expect(queries[1].constraints).toContainEqual({
      where: ['location.longitude', '<=', -170],
    });
    expect(queries[0].constraints).toContainEqual({
      where: ['spotted_time', '>=', Timestamp.fromDate(since)],
    });
    expect(queries[2].constraints).toContainEqual({
      where: ['visible', '==', true],
    });
  });
  it('paginates only unfinished streams and rejects cursors after a club or filter change', async () => {
    const { reader, tenant } = makeReader();
    mockGetDocs.mockResolvedValueOnce({
      docs: Array.from({ length: 101 }, (_, i) => makeDoc(`s${i}`)),
    });
    const first = await reader.page({ bounds });
    expect(first.local).toHaveLength(100);
    expect(first.nextCursor).toBeDefined();
    mockGetDocs.mockClear();
    const next = await reader.page({ bounds, cursor: first.nextCursor });
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(mockGetDocs.mock.calls[0][0].constraints).toContainEqual({
      startAfter: [1, 175, Timestamp.fromMillis(1000), 's99'],
    });
    expect(next.nextCursor).toBeUndefined();
    await expect(
      reader.page({
        bounds: { ...bounds, south: -5 },
        cursor: first.nextCursor,
      }),
    ).rejects.toThrow('another query');
    tenant.setAuthenticatedClub('club-two');
    await expect(
      reader.page({ bounds, cursor: first.nextCursor }),
    ).rejects.toThrow('another query');
  });
  it('rejects invalid bounds before reading', async () => {
    await expect(
      makeReader().reader.page({ bounds: { ...bounds, north: -20 } }),
    ).rejects.toThrow();
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});
