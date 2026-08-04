import { MapViewProps, Marker } from 'react-native-maps';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MapView } from '@/components/ui/MapView';
import { Sighting } from '@/core/domain';
import { useAppTheme } from '@/theme';

type SightingMapViewProps = MapViewProps & {
  list: readonly Sighting[];
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
  const theme = useAppTheme();
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
          accessibilityLabel={`View sighting: ${item.name}`}
          accessibilityRole="button"
          onPress={onPerMarkerPress ? (() => onPerMarkerPress(item)) : undefined}
        >
          <View
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radii.pill,
              borderWidth: 2,
              borderColor: theme.colors.surface,
              backgroundColor: theme.colors.coral,
            }}
          >
            <Ionicons name="paw" size={19} color={theme.colors.onPrimary} />
          </View>
        </Marker>
      ))}
      {children}
    </MapView>
  );
};
export { SightingMapView };
