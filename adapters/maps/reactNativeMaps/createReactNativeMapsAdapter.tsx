import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import RNMapView, {
  MapStyleElement,
  Marker,
  Polyline,
} from 'react-native-maps';

import {
  AppMapMarkerProps,
  AppMapPathProps,
  AppMapViewProps,
  MapAdapter,
} from '../../../presentation/maps/MapAdapter';

interface ReactNativeMapsConfiguration {
  readonly webGoogleMapsApiKey?: string;
}

type CrossPlatformMapViewProps = React.ComponentProps<typeof RNMapView> & {
  readonly googleMapsApiKey?: string;
  readonly ref?: React.Ref<RNMapView>;
};

const CrossPlatformMapView =
  RNMapView as React.ComponentType<CrossPlatformMapViewProps>;

const cameraAltitudeForZoom = (zoom: number): number => 1000 * 2 ** (16 - zoom);

const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1C2730' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#D7D5CE' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1C2730' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#475762' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#17222B' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#203128' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1D382B' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#34434E' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1D2831' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#66552B' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2A3944' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#102C3B' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#78C6E5' }],
  },
];

export function createReactNativeMapsAdapter(
  configuration: ReactNativeMapsConfiguration = {},
): MapAdapter {
  const MapView = ({
    appearance = 'light',
    children,
    initialViewport,
    onCenterChange,
    onBoundsChange,
    ...props
  }: AppMapViewProps) => {
    const map = useRef<RNMapView>(null);
    const [ready, setReady] = useState(false);
    const reportBounds = useCallback(async () => {
      if (!onBoundsChange) return;
      try {
        const { northEast, southWest } = await map.current!.getMapBoundaries();
        // Use provider boundaries directly: deriving a delta loses antimeridian wrapping.
        if (northEast.latitude > southWest.latitude)
          onBoundsChange({
            south: southWest.latitude,
            north: northEast.latitude,
            west: southWest.longitude,
            east: northEast.longitude,
          });
      } catch {
        /* Region fallback below covers providers without boundary support. */
      }
    }, [onBoundsChange]);
    useEffect(() => {
      if (ready) void reportBounds();
    }, [ready, reportBounds]);
    return (
      <CrossPlatformMapView
        {...props}
        ref={map}
        provider={Platform.OS === 'web' ? 'google' : undefined}
        googleMapsApiKey={
          Platform.OS === 'web'
            ? (configuration.webGoogleMapsApiKey ??
              process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)
            : undefined
        }
        userInterfaceStyle={appearance}
        customMapStyle={appearance === 'dark' ? [...darkMapStyle] : undefined}
        initialCamera={{
          center: initialViewport.center,
          heading: 0,
          pitch: 0,
          altitude: cameraAltitudeForZoom(initialViewport.zoom),
          zoom: initialViewport.zoom,
        }}
        onMapReady={() => setReady(true)}
        onRegionChange={
          Platform.OS === 'web' && onBoundsChange
            ? () => void reportBounds()
            : undefined
        }
        onRegionChangeComplete={
          onCenterChange || onBoundsChange
            ? (region) => {
                onCenterChange?.({
                  latitude: region.latitude,
                  longitude: region.longitude,
                });
                if (Platform.OS === 'web') {
                  void reportBounds();
                  return;
                }
                const longitude = (value: number) =>
                  ((((value + 180) % 360) + 360) % 360) - 180;
                onBoundsChange?.({
                  south: Math.max(
                    -90,
                    region.latitude - region.latitudeDelta / 2,
                  ),
                  north: Math.min(
                    90,
                    region.latitude + region.latitudeDelta / 2,
                  ),
                  west:
                    region.longitudeDelta >= 360
                      ? -180
                      : longitude(region.longitude - region.longitudeDelta / 2),
                  east:
                    region.longitudeDelta >= 360
                      ? 180
                      : longitude(region.longitude + region.longitudeDelta / 2),
                });
                void reportBounds();
              }
            : undefined
        }
      >
        {children}
      </CrossPlatformMapView>
    );
  };

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
