import {
  Firestore,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  where,
} from 'firebase/firestore';
import { FirebaseDocumentStore } from './FirebaseDocumentStore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, path) => ({ path })),
  doc: jest.fn((_db, path, id) => ({ path, id })),
  query: jest.fn((reference, ...filters) => ({ reference, filters })),
  where: jest.fn((field, operator, value) => ({ field, operator, value })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
}));

const db = {} as Firestore;
const snapshot = { docs: [{ id: 'item', data: () => ({ name: 'Cat' }) }] };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDocs).mockResolvedValue(snapshot as never);
  jest
    .mocked(getDoc)
    .mockResolvedValue({
      id: 'item',
      exists: () => true,
      data: () => ({ name: 'Cat' }),
    } as never);
});

it('shares concurrent reads but fetches again after they settle', async () => {
  const pending = deferred<typeof snapshot>();
  jest.mocked(getDocs).mockReturnValueOnce(pending.promise as never);
  const store = new FirebaseDocumentStore(db);
  const first = store.list('clubs/a/catalog');
  const second = store.list('clubs/a/catalog');
  expect(getDocs).toHaveBeenCalledTimes(1);
  pending.resolve(snapshot);
  await expect(first).resolves.toEqual(await second);
  await store.list('clubs/a/catalog');
  expect(getDocs).toHaveBeenCalledTimes(2);
});

it('keeps tenants, filters and authenticated users separate', async () => {
  let user = 'first';
  const pending = deferred<typeof snapshot>();
  jest.mocked(getDocs).mockReturnValue(pending.promise as never);
  const store = new FirebaseDocumentStore(db, () => user);
  const requests = [
    store.list('clubs/a/catalog'),
    store.list('clubs/b/catalog'),
    store.listWhereEqual('clubs/a/catalog', 'kind', 'sighting'),
    store.listWhereEqual('clubs/a/catalog', 'kind', 'sighting'),
    store.listWhereEqual('clubs/a/catalog', 'kind', 'catalog'),
  ];
  user = 'second';
  requests.push(store.list('clubs/a/catalog'));
  expect(getDocs).toHaveBeenCalledTimes(5);
  expect(where).toHaveBeenCalledWith('kind', '==', 'sighting');
  pending.resolve(snapshot);
  await Promise.all(requests);
});

it('shares document reads and removes rejected requests so a retry can succeed', async () => {
  const pending = deferred<never>();
  jest.mocked(getDoc).mockReturnValueOnce(pending.promise);
  const store = new FirebaseDocumentStore(db);
  const results = Promise.allSettled([
    store.get('settings', 'app'),
    store.get('settings', 'app'),
  ]);
  expect(getDoc).toHaveBeenCalledTimes(1);
  pending.reject(new Error('offline'));
  expect((await results).every((result) => result.status === 'rejected')).toBe(
    true,
  );
  await expect(store.get('settings', 'app')).resolves.toMatchObject({
    id: 'item',
  });
  expect(getDoc).toHaveBeenCalledTimes(2);
});

it('does not evict a newer pending read when an invalidated read finishes', async () => {
  const old = deferred<typeof snapshot>();
  const newer = deferred<typeof snapshot>();
  jest.mocked(getDocs).mockReturnValueOnce(old.promise as never).mockReturnValueOnce(newer.promise as never);
  jest.mocked(setDoc).mockResolvedValueOnce(undefined);
  const store = new FirebaseDocumentStore(db);
  const first = store.list('catalog');
  await store.put('catalog', 'item', {});
  const second = store.list('catalog');
  old.resolve(snapshot);
  await first;
  const third = store.list('catalog');
  expect(getDocs).toHaveBeenCalledTimes(2);
  newer.resolve(snapshot);
  await Promise.all([second, third]);
});

it.each(['put', 'remove', 'commit'] as const)(
  'does not reuse reads that started before or during %s',
  async (operation) => {
    const old = deferred<typeof snapshot>();
    const during = deferred<typeof snapshot>();
    const writing = deferred<void>();
    jest
      .mocked(getDocs)
      .mockReturnValueOnce(old.promise as never)
      .mockReturnValueOnce(during.promise as never);
    jest.mocked(setDoc).mockReturnValueOnce(writing.promise);
    jest.mocked(deleteDoc).mockReturnValueOnce(writing.promise);
    jest
      .mocked(writeBatch)
      .mockReturnValue({
        set: jest.fn(),
        delete: jest.fn(),
        commit: () => writing.promise,
      } as never);
    const store = new FirebaseDocumentStore(db);
    const beforeRead = store.list('catalog');
    const write =
      operation === 'put'
        ? store.put('catalog', 'item', {})
        : operation === 'remove'
          ? store.remove('catalog', 'item')
          : store.commit([
              { operation: 'remove', collection: 'catalog', id: 'item' },
            ]);
    const duringRead = store.list('catalog');
    expect(getDocs).toHaveBeenCalledTimes(2);
    writing.resolve();
    await write;
    await store.list('catalog');
    expect(getDocs).toHaveBeenCalledTimes(3);
    // Completion of an earlier generation must not interfere with newer reads.
    old.resolve(snapshot);
    during.resolve(snapshot);
    await Promise.all([beforeRead, duringRead]);
  },
);


it('routes new surveys through server validation and leaves survey closing to rules', async () => {
  const create = jest.fn().mockResolvedValue(undefined);
  const store = new FirebaseDocumentStore(db, () => 'officer', { createSurvey: create, saveTags: jest.fn(), createContest: jest.fn() });
  const data = { status: 'open', title: 'Survey', questions: [] };
  await store.put('clubs/a/community-surveys', 'survey', data);
  expect(create).toHaveBeenCalledWith('a', 'survey', data);
  expect(setDoc).not.toHaveBeenCalled();
  await store.put('clubs/a/community-surveys', 'survey', { status: 'closed' });
  expect(setDoc).toHaveBeenCalledTimes(1);
  await expect(new FirebaseDocumentStore(db).put('clubs/a/community-surveys', 'survey', data)).rejects.toThrow('validated server writer');
});


it('routes tag configuration and related assignment writes in a single server call', async () => {
  const saveTags = jest.fn().mockResolvedValue(undefined);
  const store = new FirebaseDocumentStore(db, () => 'officer', { createSurvey: jest.fn(), saveTags, createContest: jest.fn() });
  const settings = { operation: 'put' as const, collection: 'clubs/a/catalog-tag-settings', id: 'catalog', data: { tags: [] } };
  const assignment = { operation: 'put' as const, collection: 'clubs/a/catalog-tag-assignments', id: 'cat', data: { tagIds: [] } };
  await store.put(settings.collection, settings.id, settings.data);
  expect(saveTags).toHaveBeenCalledWith('a', []);
  await store.commit([settings, assignment]);
  expect(saveTags).toHaveBeenLastCalledWith('a', [], [assignment]);
  expect(writeBatch).not.toHaveBeenCalled();
  await expect(new FirebaseDocumentStore(db).commit([settings])).rejects.toThrow('validated server writer');
});


it('uses server validation for contest creation', async () => {
  const createContest = jest.fn().mockResolvedValue(undefined);
  const store = new FirebaseDocumentStore(db, () => 'officer', { createSurvey: jest.fn(), saveTags: jest.fn(), createContest });
  const contest = { kind: 'contest', options: [] };
  await store.put('clubs/a/community-votes', 'contest', contest);
  expect(createContest).toHaveBeenCalledWith('a', 'contest', contest);
  expect(setDoc).not.toHaveBeenCalled();
});
