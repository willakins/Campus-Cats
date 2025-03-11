import { Platform } from 'react-native';
import MapView, { MapViewProps, Marker } from 'react-native-maps';

// TODO: implement CatSighting type
type CatSighting = any;

type SightingMapViewProps = MapViewProps & {
  list: CatSighting[];
  filter: (item: CatSighting) => boolean;
  onPerMarkerPress?: (item: CatSighting) => void;
};

const SightingMapView: React.FC<SightingMapViewProps> = ({
  list,
  filter,
  onPerMarkerPress,
  children,
	...props
}) => {
  // Web only supports google maps
  if (Platform.OS === 'web') {
    props.provider = 'google';
  }

  return (
    <MapView {...props}>
      {list.filter(filter).map((item: CatSighting) => (
        <Marker
          key={item.id}
          coordinate={{
            latitude: item.latitude,
            longitude: item.longitude,
          }}
          title={item.name}
          description={item.info}
          onPress={onPerMarkerPress ? (() => onPerMarkerPress(item)) : undefined}
        />
      ))}
      {children}
    </MapView>
  );
};
export { SightingMapView };