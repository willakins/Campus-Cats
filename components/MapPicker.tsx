import { StyleSheet, ViewStyle } from 'react-native';
import { LatLng, MapPressEvent, MapViewProps, Marker } from 'react-native-maps';

import { MapView } from '@/components/ui/MapView';
import { InitialRegion } from '@/config/constants';

type MapPickerProps = MapViewProps & {
  location: LatLng;
  onChange: (location: LatLng) => void;
};

const MapPicker: React.FC<MapPickerProps> = ({
  location,
  onChange,
  style,
  ...props
}) => {
  const style_ = [styles.map, style as ViewStyle];

  const handleChange = (event: MapPressEvent) => {
    const coords = event.nativeEvent.coordinate;
    onChange(coords);
  };

  return (
    <MapView
      style={style_}
      initialRegion={InitialRegion}
      onPress={handleChange}
      {...props}
    >
      {location ? <Marker coordinate={location} /> : null}
    </MapView>
  );
};

export { MapPicker };

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 200,
    marginVertical: 10,
  },
});
