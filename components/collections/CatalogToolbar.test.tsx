import React, { useState } from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { CatalogSort } from '../../features/catalog';
import { AppThemeProvider } from '../../theme';
import { CatalogToolbar } from './CatalogToolbar';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const Harness = () => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CatalogSort>('name-asc');
  return (
    <AppThemeProvider colorScheme="light">
      <CatalogToolbar
        query={query}
        sort={sort}
        resultCount={3}
        onQueryChange={setQuery}
        onSortChange={setSort}
      />
    </AppThemeProvider>
  );
};

describe('CatalogToolbar', () => {
  it('searches, clears, and offers every catalog sort option', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    const search = screen.getByLabelText('Search cat profiles');
    await user.type(search, 'goldie');
    expect(search).toHaveProp('value', 'goldie');
    await user.press(screen.getByRole('button', { name: 'Clear catalog search' }));
    expect(search).toHaveProp('value', '');

    await user.press(
      screen.getByRole('button', {
        name: 'Sort catalog. Current: Name: A to Z',
      }),
    );
    expect(screen.getByRole('button', { name: 'Name: A to Z' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Name: Z to A' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Most sightings' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Most recent sighting' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Most hearts' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Most hearts' }));
    expect(screen.getByText('Sorted by most hearts')).toBeOnTheScreen();
  });
});
