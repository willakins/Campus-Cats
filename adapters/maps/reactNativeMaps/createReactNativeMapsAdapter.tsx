import React from 'react';
import { Platform } from 'react-native';
import RNMapView, { MapStyleElement, Marker, Polyline } from 'react-native-maps';

import {
  AppMapMarkerProps,
  AppMapPathProps,
  AppMapViewProps,
  MapAdapter,
} from '../../../components/maps/MapAdapter';

interface ReactNativeMapsConfiguration {
  readonly webGoogleMapsApiKey?: string;
}

type CrossPlatformMapViewProps = React.ComponentProps<typeof RNMapView> & {
  readonly googleMapsApiKey?: string;
};

const CrossPlatformMapView = RNMapView as React.ComponentType<CrossPlatformMapViewProps>;

const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1C2730' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#D7D5CE' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1C2730' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#475762' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#17222B' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#203128' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1D382B' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#34434E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1D2831' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#66552B' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2A3944' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#102C3B' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#78C6E5' }] },
];

export function createReactNativeMapsAdapter(
  configuration: ReactNativeMapsConfiguration = {},
): MapAdapter {
  const MapView = ({
    appearance = 'light',
    children,
    initialViewport,
    onCenterChange,
    ...props
  }: AppMapViewProps) => (
    <CrossPlatformMapView
      {...props}
      provider={Platform.OS === 'web' ? 'google' : undefined}
      googleMapsApiKey={
        Platform.OS === 'web'
          ? configuration.webGoogleMapsApiKey ??
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
          : undefined
      }
      userInterfaceStyle={appearance}
      customMapStyle={appearance === 'dark' ? [...darkMapStyle] : undefined}
      initialCamera={{
        center: initialViewport.center,
        heading: 0,
        pitch: 0,
        altitude: 1000,
        zoom: initialViewport.zoom,
      }}
      onRegionChangeComplete={
        onCenterChange
          ? (region) => onCenterChange({
              latitude: region.latitude,
              longitude: region.longitude,
            })
          : undefined
      }
    >
      {children}
    </CrossPlatformMapView>
  );

  const MapMarker = ({
    children,
    ...props
  }: React.PropsWithChildren<AppMapMarkerProps>) => (
    <Marker {...props}>{children}</Marker>
  );

  const MapPath = ({ coordinates, ...props }: AppMapPathProps) => (
    <Polyline coordinates={[...coordinates]} {...props} />
  );

  return Object.freeze({ View: MapView, Marker: MapMarker, Path: MapPath });
}
