import React from 'react';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import CreateCatalogEntry from '../../app/(app)/catalog/create-entry';
import { AppThemeProvider } from '../../theme';

const mockCreate = jest.fn();
const mockListTags = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    catalog: { create: (...args: unknown[]) => mockCreate(...args) },
    catalogTags: { list: (...args: unknown[]) => mockListTags(...args) },
  },
}));

jest.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@gatech.edu', role: 1 },
  }),
}));

jest.mock('../../forms/CatalogForm', () => {
  const actual = jest.requireActual('../../forms/CatalogForm');
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    ...actual,
    CatalogForm: ({
      availableTags,
      onSelectedTagIdsChange,
      setFormData,
      setPhotos,
    }: {
      availableTags: readonly { id: string; label: string }[];
      onSelectedTagIdsChange: (ids: readonly string[]) => void;
      setFormData: (data: object) => void;
      setPhotos: (photos: string[]) => void;
    }) => mockReact.createElement(
      mockReact.Fragment,
      null,
      mockReact.createElement(MockText, null, 'Catalog fields'),
      mockReact.createElement(
        MockPressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Complete catalog fields',
          onPress: () => {
            setFormData({
              name: 'Mimi',
              descShort: 'Friendly campus cat',
              descLong: 'A friendly cat seen around campus.',
              colorPattern: 'Black and white',
              behavior: '',
              yearsRecorded: '2024–2026',
              AoR: 'Library',
              furPattern: 'Tuxedo',
              credits: '',
            });
            setPhotos(['file://mimi.jpg']);
          },
        },
        mockReact.createElement(MockText, null, 'Complete catalog fields'),
      ),
      ...availableTags.map(({ id, label }) => mockReact.createElement(
        MockPressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: `Select ${label}`,
          key: id,
          onPress: () => onSelectedTagIdsChange([id]),
        },
        mockReact.createElement(MockText, null, label),
      )),
    ),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('create catalog entry route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListTags.mockResolvedValue({
      ok: true,
      value: [{ id: 'needs-medication', label: 'Needs medication' }],
      warnings: [],
    });
    mockCreate.mockResolvedValue({
      ok: true,
      value: { id: 'cat-1' },
      warnings: [],
    });
  });

  it('reveals the officer access explanation from the header shield', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateCatalogEntry />
      </AppThemeProvider>,
    );

    expect(screen.queryByText('Officer-only page')).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );

    expect(screen.getByText('Officer-only page')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Everyone can browse cat profiles. Officer-level access is required to create, edit, or delete catalog entries.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Explain officer-only access' }),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('Catalog fields')).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Hide officer-only explanation' }),
    );

    expect(screen.queryByText('Officer-only page')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    ).toBeOnTheScreen();
  });

  it('saves officer-selected configured tags with the new entry', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateCatalogEntry />
      </AppThemeProvider>,
    );

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Select Needs medication' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Complete catalog fields' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Create Entry' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tagIds: ['needs-medication'] }),
    ));
  });
});
