import React from 'react';

import { render, screen } from '@testing-library/react-native';

import EditCatalogEntry from '../../app/(app)/catalog/edit-entry';
import EditSighting from '../../app/(app)/sighting/edit-sighting';
import EditStation from '../../app/(app)/stations/edit-station';
import { AppThemeProvider } from '../../theme';

const mockPending = (..._args: unknown[]) => new Promise(() => undefined);

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'record-1' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@gatech.edu', role: 2 },
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    announcements: {
      get: (...args: unknown[]) => mockPending(...args),
      media: (...args: unknown[]) => mockPending(...args),
    },
    catalog: {
      get: (...args: unknown[]) => mockPending(...args),
      media: (...args: unknown[]) => mockPending(...args),
    },
    inaturalist: { updateCatalog: jest.fn(), setVisibility: jest.fn() },
    sightings: {
      get: (...args: unknown[]) => mockPending(...args),
      media: (...args: unknown[]) => mockPending(...args),
    },
    stations: {
      get: (...args: unknown[]) => mockPending(...args),
      media: (...args: unknown[]) => mockPending(...args),
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderThemed = async (content: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>,
  );

describe('database-backed editor loading states', () => {
  it.each([
    {
      title: 'Edit catalog entry',
      label: 'Loading catalog form',
      route: <EditCatalogEntry />,
    },
    {
      title: 'Edit sighting',
      label: 'Loading sighting form',
      route: <EditSighting />,
    },
    {
      title: 'Edit station',
      label: 'Loading station form',
      route: <EditStation />,
    },
  ])('renders $title chrome before its database record', async ({ title, label, route }) => {
    const { unmount } = await renderThemed(route);

    expect(screen.getByText(title)).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: label })).toBeOnTheScreen();

    await unmount();
  });
});
