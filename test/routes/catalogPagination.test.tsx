import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import Catalog from '../../app/(app)/(tabs)/catalog';
import { AppThemeProvider } from '../../theme';
import {
  parseCatalogEntry,
  localCatalogRecord,
  parseUser,
  success,
  type Outcome,
} from '../../core/domain';
import type {
  CatalogDiscoveryCard,
  CatalogDiscoveryCursor,
  CatalogDiscoveryPage,
} from '../../core/ports';

const mockDiscover = jest.fn();
const mockMedia = jest.fn();
let mockListProps:
  | { data: readonly CatalogDiscoveryCard[]; onEndReached: () => void }
  | undefined;
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const ReactRuntime = require('react');
  return Object.defineProperty(actual, 'FlatList', {
    configurable: true,
    value: (props: {
      data: readonly CatalogDiscoveryCard[];
      onEndReached: () => void;
      renderItem: (input: { item: CatalogDiscoveryCard }) => React.ReactNode;
    }) => {
      mockListProps = props;
      return ReactRuntime.createElement(
        actual.View,
        null,
        props.data.map((item) =>
          ReactRuntime.createElement(
            actual.View,
            { key: item.entry.id },
            props.renderItem({ item }),
          ),
        ),
      );
    },
  });
});
jest.mock('expo-router', () => {
  const ReactRuntime = require('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) =>
      ReactRuntime.useEffect(effect, [effect]),
  };
});
const mockActor = parseUser({
  id: 'member',
  email: 'member@example.com',
  role: 0,
});
jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({ currentUser: mockActor, user: mockActor }),
}));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    catalog: {
      usesPagedDiscovery: true,
      discover: (...args: unknown[]) => mockDiscover(...args),
      media: (...args: unknown[]) => mockMedia(...args),
      setFavorite: jest.fn(),
    },
  },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const card = (id: string): CatalogDiscoveryCard => ({
  entry: localCatalogRecord(
    parseCatalogEntry({
      id,
      cat: {
        name: id,
        descShort: 'Friendly',
        descLong: 'Campus cat',
        colorPattern: 'Black',
        behavior: 'Calm',
        yearsRecorded: '2026',
        AoR: 'Campus',
        currentStatus: 'Feral',
        furLength: 'Short',
        furPattern: 'Solid',
        tnr: 'Yes',
        sex: 'Female',
      },
      credits: '',
      createdAt: new Date('2026-10-01Z'),
    }),
  ),
  sightingCount: 10,
  heartCount: 2,
  isFavorite: false,
  tags: [],
  cover: null,
});
const cursor: CatalogDiscoveryCursor = {
  id: 'a',
  name: 'a',
  metric: null,
  sort: 'name-asc',
  search: '',
  tagIds: [],
};
const page = (
  items: readonly CatalogDiscoveryCard[],
  nextCursor?: CatalogDiscoveryCursor,
): Outcome<CatalogDiscoveryPage> =>
  success({ items, total: 2, availableTags: [], nextCursor });
beforeEach(() => {
  jest.clearAllMocks();
  mockListProps = undefined;
});

it('renders bounded server cards and loads the next cursor without per-card Storage requests', async () => {
  mockDiscover
    .mockResolvedValueOnce(page([card('a')], cursor))
    .mockResolvedValueOnce(page([card('b')]));
  await render(
    <AppThemeProvider>
      <Catalog />
    </AppThemeProvider>,
  );
  await screen.findByLabelText('View cat: a');
  expect(mockDiscover.mock.calls[0][1]).toMatchObject({
    pageSize: 40,
    search: '',
    sort: 'name-asc',
  });
  expect(mockMedia).not.toHaveBeenCalled();
  await act(async () => {
    mockListProps?.onEndReached();
  });
  await screen.findByLabelText('View cat: b');
  expect(mockDiscover.mock.calls[1][1]).toMatchObject({ pageSize: 40, cursor });
  expect(mockListProps?.data.map((item) => item.entry.id)).toEqual(['a', 'b']);
});

it('discards an old next page after changing the search', async () => {
  let resolveOld: (value: Outcome<CatalogDiscoveryPage>) => void = () =>
    undefined;
  const old = new Promise<Outcome<CatalogDiscoveryPage>>((resolve) => {
    resolveOld = resolve;
  });
  mockDiscover
    .mockResolvedValueOnce(page([card('a')], cursor))
    .mockReturnValueOnce(old)
    .mockResolvedValueOnce(page([card('new')]));
  await render(
    <AppThemeProvider>
      <Catalog />
    </AppThemeProvider>,
  );
  await screen.findByLabelText('View cat: a');
  await act(async () => {
    mockListProps?.onEndReached();
  });
  await fireEvent.changeText(screen.getByLabelText('Search cat profiles'), 'new');
  await screen.findByLabelText('View cat: new');
  await act(async () => {
    resolveOld(page([card('obsolete')]));
  });
  await waitFor(() =>
    expect(mockListProps?.data.map((item) => item.entry.id)).toEqual(['new']),
  );
});
