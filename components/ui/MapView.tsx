import { Platform } from 'react-native';
import RNMapView, { MapViewProps, PROVIDER_GOOGLE } from 'react-native-maps';

export const MapView: React.FC<MapViewProps> = ({
  children,
  provider,
  ...props
}) => {
  return (
    <RNMapView
      provider={Platform.OS === 'web' ? PROVIDER_GOOGLE : provider}
      {...props}
    >
      {children}
    </RNMapView>
  );
};
