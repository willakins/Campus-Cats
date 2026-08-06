import React from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { MapMarkerProps, Marker } from 'react-native-maps';

import { useAppTheme } from '../../theme';

type AppMapMarkerProps = Omit<MapMarkerProps, 'children'> & {
  readonly backgroundColor?: string;
};

export const MapMarker = ({ backgroundColor, ...props }: AppMapMarkerProps) => {
  const theme = useAppTheme();

  return (
    <Marker {...props}>
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
    </Marker>
  );
};
