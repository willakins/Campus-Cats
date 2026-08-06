import type { ComponentType, PropsWithChildren, ReactNode } from 'react';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';

import type { Coordinates } from '../../core/domain';

export type MapAppearance = 'light' | 'dark';

export interface MapViewport {
  readonly center: Coordinates;
  readonly zoom: number;
}

export interface AppMapViewProps {
  readonly children?: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
  readonly appearance?: MapAppearance;
  readonly initialViewport: MapViewport;
  readonly onCenterChange?: (center: Coordinates) => void;
}

export interface AppMapMarkerProps {
  readonly coordinate: Coordinates;
  readonly title?: string;
  readonly description?: string;
  readonly onPress?: () => void;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
  readonly accessibilityRole?: AccessibilityRole;
}

export interface MapAdapter {
  readonly View: ComponentType<AppMapViewProps>;
  readonly Marker: ComponentType<PropsWithChildren<AppMapMarkerProps>>;
}
