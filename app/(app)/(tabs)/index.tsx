import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { SightingMapView } from '@/components/SightingMapView';
import { Button, FeedbackBanner, SegmentedControl, StatusPill, Screen } from '@/components/design';
import { campusMapDarkStyle } from '@/components/mapStyles';
import { appModules } from '@/composition/appModules';
import { SightingRecord, SystemClock } from '@/core/domain';
import { filterSightingsByAge } from '@/features/sightings';
import { useAppTheme } from '@/theme';

const clock = new SystemClock();

const HomeScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const [filter, setFilter] = useState<'7' | '30' | '90' | '365' | 'all'>('all');
  const [pins, setPins] = useState<readonly SightingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      void appModules.sightings.list().then((result) => {
        if (!active) return;
        if (result.ok) {
          setPins(result.value);
        } else {
          setError(result.error.message);
        }
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const visiblePins = filterSightingsByAge(
    pins,
    filter === 'all' ? undefined : Number(filter),
    clock,
  );

  return (
    <Screen fullBleed>
      <View style={{ flex: 1 }}>
        <SightingMapView
          list={visiblePins}
          filter={() => true}
          style={{ flex: 1 }}
          userInterfaceStyle={theme.dark ? 'dark' : 'light'}
          customMapStyle={theme.dark ? [...campusMapDarkStyle] : undefined}
          initialRegion={{
            latitude: 33.776077,
            longitude: -84.396199,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPerMarkerPress={(pin) =>
            router.push({
              pathname: '/sighting/view-sighting',
              params: { id: pin.id },
            })
          }
        />
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: theme.spacing.sm,
            left: theme.spacing.sm,
            right: theme.spacing.sm,
            gap: theme.spacing.xs,
          }}
        >
          <View
            style={[
              theme.elevation.floating,
              {
                padding: theme.spacing.xs,
                borderRadius: theme.radii.card,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <SegmentedControl
              label="Sighting age"
              value={filter}
              options={[
                { value: '7', label: '7D' },
                { value: '30', label: '30D' },
                { value: '90', label: '90D' },
                { value: '365', label: '1Y' },
                { value: 'all', label: 'All' },
              ]}
              onChange={setFilter}
            />
          </View>
          <StatusPill
            label={loading ? 'Loading sightings' : `${visiblePins.length} ${visiblePins.length === 1 ? 'sighting' : 'sightings'}`}
            tone="neutral"
            icon="paw"
          />
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        </View>
        <View
          style={{
            position: 'absolute',
            left: theme.spacing.lg,
            right: theme.spacing.lg,
            bottom: theme.spacing.lg,
            alignItems: 'center',
          }}
        >
          <Button
            label="Report a sighting"
            icon="add"
            fullWidth
            style={{
              maxWidth: theme.layout.maxAuthWidth,
              backgroundColor: theme.colors.coral,
              borderColor: theme.colors.coral,
            }}
            onPress={() => router.push('/sighting/create-sighting')}
          />
        </View>
      </View>
    </Screen>
  );
};

export default HomeScreen;
