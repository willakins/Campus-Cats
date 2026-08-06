import { MapViewProps } from 'react-native-maps';

import { MapView } from '@/components/ui/MapView';
import { MapMarker } from '@/components/ui/MapMarker';
import { SightingRecord } from '@/core/domain';
import { useAppTheme } from '@/theme';

type SightingMapViewProps = MapViewProps & {
  list: readonly SightingRecord[];
  filter: (item: SightingRecord) => boolean;
  onPerMarkerPress?: (item: SightingRecord) => void;
};

const SightingMapView: React.FC<SightingMapViewProps> = ({
  list,
  filter,
  onPerMarkerPress,
  children,
  ...props
}) => {
  const theme = useAppTheme();
  return (
    <MapView {...props}>
      {list.filter((item) => filter(item) && item.location !== null).map((item) => (
        <MapMarker
          key={item.id}
          coordinate={{
            latitude: item.location!.latitude,
            longitude: item.location!.longitude,
          }}
          title={item.name}
          description={item.info}
          accessibilityLabel={`View sighting: ${item.name}`}
          accessibilityRole="button"
          onPress={onPerMarkerPress ? (() => onPerMarkerPress(item)) : undefined}
          backgroundColor={
            item.source === 'inaturalist'
              ? theme.colors.teal
              : theme.colors.coral
          }
        />
      ))}
      {children}
    </MapView>
  );
};
export { SightingMapView };
