import React from 'react';
import { Platform, View } from 'react-native';

import { render, screen } from '@testing-library/react-native';

import { MapView } from './MapView';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = React.forwardRef(
    (
      { children, ...props }: { children?: React.ReactNode },
      ref: React.Ref<unknown>,
    ) => React.createElement(View, { ...props, ref }, children),
  );
  MockMapView.displayName = 'MockWebMapView';

  return {
    __esModule: true,
    default: MockMapView,
  };
});

describe('MapView', () => {
  const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-web-maps-key';
  });

  afterEach(() => {
    if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
    if (googleMapsApiKey === undefined) {
      delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = googleMapsApiKey;
    }
  });

  it('selects the Google provider on web without relying on a native export', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });

    await render(
      <MapView testID="map">
        <View testID="map-child" />
      </MapView>,
    );

    expect(screen.getByTestId('map')).toHaveProp('provider', 'google');
    expect(screen.getByTestId('map')).toHaveProp(
      'googleMapsApiKey',
      'test-web-maps-key',
    );
    expect(screen.getByTestId('map-child')).toBeOnTheScreen();
  });
});
