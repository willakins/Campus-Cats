import { Platform } from 'react-native';
import RNMapView, { MapViewProps } from 'react-native-maps';

type CrossPlatformMapViewProps = MapViewProps & {
  readonly googleMapsApiKey?: string;
};

const CrossPlatformMapView = RNMapView as React.ComponentType<CrossPlatformMapViewProps>;

export const MapView: React.FC<CrossPlatformMapViewProps> = ({
  children,
  provider,
  googleMapsApiKey,
  ...props
}) => {
  return (
    <CrossPlatformMapView
      provider={Platform.OS === 'web' ? 'google' : provider}
      googleMapsApiKey={
        Platform.OS === 'web'
          ? googleMapsApiKey ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
          : undefined
      }
      {...props}
    >
      {children}
    </CrossPlatformMapView>
  );
};
