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

  it('translates the app map interface to the selected web adapter', async () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'web',
    });
    const onCenterChange = jest.fn();

    await render(
      <MapView
        testID="map"
        appearance="dark"
        initialViewport={{
          center: { latitude: 33.776077, longitude: -84.396199 },
          zoom: 16,
        }}
        onCenterChange={onCenterChange}
      >
        <View testID="map-child" />
      </MapView>,
    );

    expect(screen.getByTestId('map')).toHaveProp('provider', 'google');
    expect(screen.getByTestId('map')).toHaveProp(
      'googleMapsApiKey',
      'test-web-maps-key',
    );
    expect(screen.getByTestId('map')).toHaveProp('userInterfaceStyle', 'dark');
    expect(screen.getByTestId('map')).toHaveProp('initialCamera', {
      center: { latitude: 33.776077, longitude: -84.396199 },
      heading: 0,
      pitch: 0,
      altitude: 1000,
      zoom: 16,
    });
    await screen.getByTestId('map').props.onRegionChangeComplete({
      latitude: 33.772,
      longitude: -84.394,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    expect(onCenterChange).toHaveBeenCalledWith({
      latitude: 33.772,
      longitude: -84.394,
    });
    expect(screen.getByTestId('map-child')).toBeOnTheScreen();
  });
});
