import React from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { appMapAdapter } from '../../composition/mapAdapter';
import { useAppTheme } from '../../theme';
import { AppMapMarkerProps } from '../maps/MapAdapter';

type MapMarkerProps = AppMapMarkerProps & {
  readonly backgroundColor?: string;
};

export const MapMarker = ({ backgroundColor, ...props }: MapMarkerProps) => {
  const theme = useAppTheme();
  const AdapterMarker = appMapAdapter.Marker;

  return (
    <AdapterMarker {...props}>
      <View
        testID="map-marker-visual"
        style={{
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.pill,
          borderWidth: 2,
          borderColor: theme.colors.surface,
          backgroundColor: backgroundColor ?? theme.colors.coral,
        }}
      >
        <Ionicons name="paw" size={19} color={theme.colors.onPrimary} />
      </View>
    </AdapterMarker>
  );
};
