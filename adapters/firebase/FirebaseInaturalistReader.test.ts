import { Firestore, getDocs, getDoc, where } from 'firebase/firestore';
import { FirebaseInaturalistReader } from './FirebaseInaturalistReader';
import { FirebaseTenantScope } from './FirebaseTenantScope';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, path) => ({ path })),
  doc: jest.fn((_db, path, id) => ({ path, id })),
  query: jest.fn((reference, ...filters) => ({ reference, filters })),
  where: jest.fn((field, operator, value) => ({ field, operator, value })),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
}));

const scope = new FirebaseTenantScope();
const db = {} as Firestore;
const snapshot = { docs: [] };

beforeEach(() => {
  jest.clearAllMocks();
  scope.setAuthenticatedClub('a');
  jest.mocked(getDocs).mockResolvedValue(snapshot as never);
  jest.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);
});

it('queries visible observations for one numeric observer instead of listing every observation', async () => {
  const reader = new FirebaseInaturalistReader(db, scope);
  await reader.listObservationsByObserver(42);
  expect(getDocs).toHaveBeenCalledWith({
    reference: { path: 'clubs/a/inaturalist-observations' },
    filters: [
      { field: 'visible', operator: '==', value: true },
      { field: 'observer.id', operator: '==', value: 42 },
    ],
  });
  expect(where).toHaveBeenCalledWith('observer.id', '==', 42);
  await expect(reader.listObservationsByObserver(-1)).rejects.toThrow(
    'observer ID',
  );
  expect(getDocs).toHaveBeenCalledTimes(1);
});

it('only shares pending requests with identical visibility, observer, tenant and user scopes', async () => {
  let resolve!: (value: typeof snapshot) => void;
  const pending = new Promise<typeof snapshot>((yes) => {
    resolve = yes;
  });
  jest.mocked(getDocs).mockReturnValue(pending as never);
  let user = 'first';
  const reader = new FirebaseInaturalistReader(db, scope, () => user);
  const requests = [
    reader.listObservations(false),
    reader.listObservations(false),
    reader.listObservations(true),
    reader.listObservationsByObserver(42),
    reader.listObservationsByObserver(42),
    reader.listObservationsByObserver(43),
  ];
  scope.setAuthenticatedClub('b');
  requests.push(reader.listObservations(false));
  user = 'second';
  requests.push(reader.listObservations(false));
  expect(getDocs).toHaveBeenCalledTimes(6);
  resolve(snapshot);
  await Promise.all(requests);
  await reader.listObservations(false);
  expect(getDocs).toHaveBeenCalledTimes(7);
});

it('coalesces observation and guide detail reads without confusing record kinds', async () => {
  let resolve!: (value: unknown) => void;
  const pending = new Promise((yes) => {
    resolve = yes;
  });
  jest.mocked(getDoc).mockReturnValue(pending as never);
  const reader = new FirebaseInaturalistReader(db, scope);
  const requests = [
    reader.getObservation(42),
    reader.getObservation(42),
    reader.getCatalog(42),
  ];
  expect(getDoc).toHaveBeenCalledTimes(2);
  resolve({ exists: () => false });
  await Promise.all(requests);
});
