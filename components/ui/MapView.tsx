import { Platform } from 'react-native';
import RNMapView, { MapViewProps, PROVIDER_GOOGLE } from 'react-native-maps';

export const MapView: React.FC<MapViewProps> = ({ children, ...props }) => {
  // Web only supports google maps
  if (Platform.OS === 'web') {
    props.provider = PROVIDER_GOOGLE;
  }

  return <RNMapView {...props}>{children}</RNMapView>;
};
