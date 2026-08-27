import React from 'react';

import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import EditCatalogEntry from '../../app/(app)/catalog/edit-entry';
import { AppThemeProvider } from '../../theme';

const mockUpdate = jest.fn();
const mockAssign = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'cat-1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@gatech.edu', role: 1 },
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    catalog: {
      get: jest.fn().mockResolvedValue({
        ok: true,
        value: {
          source: 'campus-cats',
          id: 'cat-1',
          cat: {
            name: 'Mimi',
            descShort: 'Friendly cat',
            descLong: 'Often seen on campus.',
            colorPattern: 'Black and white',
            behavior: 'Friendly',
            yearsRecorded: '2025-2026',
            AoR: 'Central campus',
            currentStatus: 'Feral',
            furLength: 'Short',
            furPattern: 'Tuxedo',
            tnr: 'Yes',
            sex: 'Female',
          },
          credits: '',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        warnings: [],
      }),
      media: jest.fn().mockResolvedValue({
        ok: true,
        value: [{ id: 'photo-1', url: 'file://profile.jpg', role: 'profile' }],
        warnings: [],
      }),
      update: (...args: unknown[]) => mockUpdate(...args),
      remove: jest.fn(),
    },
    catalogTags: {
      list: jest.fn().mockResolvedValue({
        ok: true,
        value: [{ id: 'medical', label: 'Needs medication' }],
        warnings: [],
      }),
      assignments: jest.fn().mockResolvedValue({
        ok: true,
        value: [{ catalogId: 'cat-1', tagIds: ['medical'] }],
        warnings: [],
      }),
      assign: (...args: unknown[]) => mockAssign(...args),
    },
    inaturalist: { updateCatalog: jest.fn(), setVisibility: jest.fn() },
  },
}));

jest.mock('../../forms/CatalogForm', () => {
  const actual = jest.requireActual('../../forms/CatalogForm');
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    ...actual,
    CatalogForm: ({ selectedTagIds }: { selectedTagIds: readonly string[] }) =>
      mockReact.createElement(
        MockText,
        null,
        `Selected tags: ${selectedTagIds.join(',')}`,
      ),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('edit catalog entry tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockAssign.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('reveals the officer access explanation from the header shield', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <EditCatalogEntry />
      </AppThemeProvider>,
    );

    await screen.findByText('Selected tags: medical');
    await user.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );

    expect(screen.getByText('Officer-only page')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Everyone can browse cat profiles. Officer-level access is required to create, edit, or delete catalog entries.',
      ),
    ).toBeOnTheScreen();
  });

  it('loads and saves the profile’s explicit configured tags', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <EditCatalogEntry />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Selected tags: medical')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Save Entry' }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'officer-1' }),
        'cat-1',
        expect.objectContaining({ tagIds: ['medical'] }),
      ),
    );
    expect(mockAssign).not.toHaveBeenCalled();
  });
});
