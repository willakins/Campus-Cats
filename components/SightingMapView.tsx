import { MapViewProps, Marker } from 'react-native-maps';
import { MapView } from '@/components/ui/MapView';

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
  return (
    <MapView {...props}>
      {list.filter(filter).map((item: CatSighting) => (
        <Marker
          key={item.id}
          coordinate={{
            latitude: item.location.latitude,
            longitude: item.location.longitude,
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
