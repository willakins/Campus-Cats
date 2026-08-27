import React, { useState } from 'react';

import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { CatalogRecord } from '../../core/domain';
import { AppThemeProvider } from '../../theme';
import { CatalogCatField } from './CatalogCatField';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: jest.fn(),
    },
  },
}));
jest.mock('../items/CatalogItem', () => {
  const mockReact = require('react');
  const {
    Pressable: MockPressable,
    Text: MockText,
  } = require('react-native');
  return {
    CatalogItem: ({ accessibilityLabel, cat, onPress }: {
      accessibilityLabel: string;
      cat: { name: string };
      onPress: () => void;
    }) => mockReact.createElement(
      MockPressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel,
        onPress,
      },
      mockReact.createElement(MockText, null, `${cat.name} profile card`),
    ),
  };
});

const entries: readonly CatalogRecord[] = [
  catalogRecord('catalog-goldie', 'Goldie', 'Friendly orange tabby near the library.'),
  catalogRecord('catalog-mimi', 'Mimi', 'Black-and-white cat near Tech Green.'),
];

const PickerHarness = ({ onChange = jest.fn() }: { onChange?: (value: string) => void }) => {
  const [value, setValue] = useState('');
  return (
    <AppThemeProvider colorScheme="light">
      <CatalogCatField
        value={value}
        entries={entries}
        loading={false}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </AppThemeProvider>
  );
};

describe('catalog cat field', () => {
  it('searches known cats and retains an explicit new-cat path', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<PickerHarness onChange={onChange} />);

    await fireEvent.changeText(screen.getByLabelText('Cat name'), 'Gol');
    await user.press(
      await screen.findByRole('button', { name: 'Select catalog cat Goldie' }),
    );

    expect(screen.getByLabelText('Cat name')).toHaveProp('value', 'Goldie');
    expect(screen.getByText('Catalog cat selected')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Cat name'), 'Mystery Cat');
    await user.press(
      screen.getByRole('button', { name: 'Use Mystery Cat as a new cat' }),
    );

    expect(screen.getByLabelText('Cat name')).toHaveProp('value', 'Mystery Cat');
    expect(onChange).toHaveBeenLastCalledWith('Mystery Cat');
  });

  it('opens a visual catalog and returns the selected profile name', async () => {
    const user = userEvent.setup();
    await render(<PickerHarness />);

    await user.press(screen.getByRole('button', { name: 'Browse cat catalog' }));
    expect(screen.getByText('Choose a cat')).toBeOnTheScreen();
    expect(screen.getByText('Goldie profile card')).toBeOnTheScreen();
    expect(screen.getByText('Mimi profile card')).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Select Mimi for this sighting' }),
    );

    expect(screen.queryByText('Choose a cat')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Cat name')).toHaveProp('value', 'Mimi');
  });
});

function catalogRecord(id: string, name: string, descShort: string): CatalogRecord {
  return {
    source: 'inaturalist',
    id,
    sourceId: Number(id.length),
    cat: { name, descShort },
    credits: '',
    sourceUrl: `https://example.com/${id}`,
    sourceUpdatedAt: new Date('2026-08-20T12:00:00.000Z'),
    matchStatus: 'unlinked',
    sourceActive: true,
    visible: true,
    moderation: { hidden: false, reason: '' },
  };
}
