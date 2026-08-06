import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { SightingMapView } from '@/components/SightingMapView';
import {
  FeedbackBanner,
  FloatingActionButton,
  SegmentedControl,
  StatusPill,
  Screen,
} from '@/components/design';
import { createCampusViewport, GEORGIA_TECH_CENTER } from '@/components/mapViewport';
import { appModules } from '@/composition/appModules';
import { SightingRecord, SystemClock } from '@/core/domain';
import { filterSightingsByAge } from '@/features/sightings';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const clock = new SystemClock();

const HomeScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'7' | '30' | '90' | '365' | 'all'>('all');
  const [pins, setPins] = useState<readonly SightingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      void appModules.sightings.list(currentUser).then((result) => {
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
    }, [currentUser?.id, currentUser?.role]),
  );

  const visiblePins = filterSightingsByAge(
    pins,
    filter === 'all' ? undefined : Number(filter),
    clock,
  );
  const mappablePins = visiblePins.filter(({ location }) => location !== null);

  return (
    <Screen
      fullBleed
      floatingAction={(
        <FloatingActionButton
          accessibilityLabel="Report a sighting"
          accessibilityHint="Opens the new sighting report form"
          style={{
            backgroundColor: theme.colors.coral,
            borderColor: theme.colors.coral,
          }}
          onPress={() => router.push('/sighting/create-sighting')}
        />
      )}
    >
      <View style={{ flex: 1 }}>
        <SightingMapView
          list={mappablePins}
          filter={() => true}
          style={{ flex: 1 }}
          appearance={theme.dark ? 'dark' : 'light'}
          initialViewport={createCampusViewport(GEORGIA_TECH_CENTER)}
          onPerMarkerPress={(pin) =>
            router.push({
              pathname: '/sighting/view-sighting',
              params: { id: pin.id },
            })
          }
        />
        <View
          style={{
            pointerEvents: 'box-none',
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
            label={loading ? 'Loading sightings' : `${mappablePins.length} ${mappablePins.length === 1 ? 'sighting' : 'sightings'}`}
            tone="neutral"
            icon="paw"
            loading={loading}
          />
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        </View>
      </View>
    </Screen>
  );
};

export default HomeScreen;
