import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    CatalogForm: ({ availableTags, onSelectedTagIdsChange }: {
      availableTags: readonly { id: string; label: string }[];
      onSelectedTagIdsChange: (ids: readonly string[]) => void;
    }) => mockReact.createElement(
      mockReact.Fragment,
      null,
      mockReact.createElement(MockText, null, 'Catalog fields'),
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

  it('keeps the officer access explanation with the creation form', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <CreateCatalogEntry />
      </AppThemeProvider>,
    );

    expect(screen.getByText('Catalog access')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Everyone can browse cat profiles. Only officers can create or edit catalog entries.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Catalog fields')).toBeOnTheScreen();
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
    await fireEvent.press(screen.getByRole('button', { name: 'Create Entry' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tagIds: ['needs-medication'] }),
    ));
  });
});
