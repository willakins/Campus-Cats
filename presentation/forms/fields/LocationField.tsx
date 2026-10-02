import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Coordinates } from '@/core/domain';
import { MapView } from '@/presentation/maps/MapView';
import {
  createCampusViewport,
  GEORGIA_TECH_CENTER,
} from '@/presentation/maps/mapViewport';
import { Button, FeedbackBanner, FormField } from '@/presentation/ui';
import { getCurrentCoordinates } from '@/adapters/expo/currentLocation';
import { useAppTheme } from '@/theme';

export const LocationField = ({
  label,
  value,
  error,
  onChange,
  allowCurrentLocation = false,
}: {
  readonly label: string;
  readonly value: Coordinates;
  readonly error?: string;
  readonly allowCurrentLocation?: boolean;
  readonly onChange: (coordinates: Coordinates) => void;
}) => {
  const theme = useAppTheme();
  const hasLocation = value.latitude !== 0 || value.longitude !== 0;
  const lastSelectedCenter = useRef(hasLocation ? value : GEORGIA_TECH_CENTER);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const [mapPosition, setMapPosition] = useState<{
    center: Coordinates;
    revision: number;
  }>();
  const requestInFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const chooseCurrentLocation = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLocating(true);
    setLocationError(undefined);
    try {
      const coordinates = await getCurrentCoordinates();
      if (!mounted.current) return;
      lastSelectedCenter.current = coordinates;
      onChange(coordinates);
      // The map adapter accepts an initial viewport; remount only for this explicit recenter.
      setMapPosition((current) => ({
        center: coordinates,
        revision: (current?.revision ?? 0) + 1,
      }));
    } catch (caught) {
      if (mounted.current)
        setLocationError(
          caught instanceof Error
            ? caught.message
            : 'Could not find your current location. Try again or choose it on the map.',
        );
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setLocating(false);
    }
  };

  return (
    <FormField
      label={label}
      required
      helper="Drag the map to position the pin."
      error={error}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View
          accessibilityLabel={`${label} field`}
          style={{
            height: 240,
            overflow: 'hidden',
            borderWidth: error ? 2 : 0,
            borderColor: theme.colors.danger,
            borderRadius: theme.radii.card,
          }}
        >
          <MapView
            key={mapPosition?.revision ?? 0}
            accessibilityLabel={label}
            style={{ flex: 1 }}
            appearance={theme.dark ? 'dark' : 'light'}
            initialViewport={createCampusViewport(
              mapPosition?.center ??
                (hasLocation ? value : GEORGIA_TECH_CENTER),
            )}
            onCenterChange={(center) => {
              if (sameCoordinates(center, lastSelectedCenter.current)) return;
              lastSelectedCenter.current = center;
              onChange(center);
            }}
          />
          <View
            style={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <View
              accessible
              accessibilityLabel={`${label} pin`}
              accessibilityRole="image"
              style={{ transform: [{ translateY: -20 }] }}
            >
              <Ionicons
                name="location-sharp"
                size={44}
                color={theme.colors.coral}
              />
            </View>
          </View>
        </View>
        {allowCurrentLocation ? (
          <Button
            label="Choose current location"
            icon="locate-outline"
            variant="secondary"
            loading={locating}
            loadingLabel="Finding your location…"
            disabled={locating}
            onPress={() => void chooseCurrentLocation()}
          />
        ) : null}
        {locationError ? (
          <FeedbackBanner message={locationError} tone="warning" />
        ) : null}
      </View>
    </FormField>
  );
};

const sameCoordinates = (left: Coordinates, right: Coordinates) =>
  Math.abs(left.latitude - right.latitude) < 0.000001 &&
  Math.abs(left.longitude - right.longitude) < 0.000001;
