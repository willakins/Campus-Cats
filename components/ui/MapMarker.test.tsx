import React from 'react';

import { render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { MapMarker } from './MapMarker';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('MapMarker', () => {
  it('always supplies a custom marker visual for the web map adapter', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <MapMarker
          coordinate={{ latitude: 33.776077, longitude: -84.396199 }}
          testID="campus-marker"
        />
      </AppThemeProvider>,
    );

    expect(screen.getByTestId('campus-marker')).toBeOnTheScreen();
    expect(screen.getByTestId('map-marker-visual')).toBeOnTheScreen();
  });
});
