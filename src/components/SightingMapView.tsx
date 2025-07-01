import { MapViewProps, Marker } from 'react-native-maps';

import { MapView } from '@/components/ui/MapView';
import { Sighting } from '@/types';

type SightingMapViewProps = MapViewProps & {
  list: Sighting[];
  filter: (item: Sighting) => boolean;
  onPerMarkerPress?: (item: Sighting) => void;
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
      {list.filter(filter).map((item: Sighting) => (
        <Marker
          key={item.id}
          coordinate={{
            latitude: item.location.latitude,
            longitude: item.location.longitude,
          }}
          title={item.name}
          description={item.info}
          onPress={onPerMarkerPress ? () => onPerMarkerPress(item) : undefined}
        />
      ))}
      {children}
    </MapView>
  );
};
export { SightingMapView };
