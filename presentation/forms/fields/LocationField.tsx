import { useRef } from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Coordinates } from '@/core/domain';
import { MapView } from '@/presentation/maps/MapView';
import {
  createCampusViewport,
  GEORGIA_TECH_CENTER,
} from '@/presentation/maps/mapViewport';
import { FormField } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

export const LocationField = ({
  label,
  value,
  error,
  onChange,
}: {
  readonly label: string;
  readonly value: Coordinates;
  readonly error?: string;
  readonly onChange: (coordinates: Coordinates) => void;
}) => {
  const theme = useAppTheme();
  const hasLocation = value.latitude !== 0 || value.longitude !== 0;
  const lastSelectedCenter = useRef(hasLocation ? value : GEORGIA_TECH_CENTER);
  return (
    <FormField
      label={label}
      required
      helper="Drag the map to position the pin."
      error={error}
    >
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
          accessibilityLabel={label}
          style={{ flex: 1 }}
          appearance={theme.dark ? 'dark' : 'light'}
          initialViewport={createCampusViewport(
            hasLocation ? value : GEORGIA_TECH_CENTER,
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
    </FormField>
  );
};

const sameCoordinates = (left: Coordinates, right: Coordinates) =>
  Math.abs(left.latitude - right.latitude) < 0.000001 &&
  Math.abs(left.longitude - right.longitude) < 0.000001;
