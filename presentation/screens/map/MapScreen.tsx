import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SightingMapView } from '@/presentation/screens/map/components/SightingMapView';
import {
  Button,
  FeedbackBanner,
  FloatingActionButton,
  GlassSurface,
  SegmentedControl,
  StatusPill,
  Screen,
} from '@/presentation/ui';
import { createCampusOverviewViewport } from '@/presentation/maps/mapViewport';
import { floatingTabBarContentInset } from '@/presentation/navigation/floatingTabBar';
import { appModules } from '@/composition/appModules';
import { SightingRecord, SystemClock } from '@/core/domain';
import { MapBounds } from '@/core/ports';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

const clock = new SystemClock();

const HomeScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'7' | '30' | '90' | '365' | 'all'>(
    'all',
  );
  const [pins, setPins] = useState<readonly SightingRecord[]>([]);
  const [bounds, setBounds] = useState<MapBounds>({
    south: 33.746077,
    north: 33.806077,
    west: -84.426199,
    east: -84.366199,
  });
  const [cursor, setCursor] = useState<string>();
  const generation = useRef(0);
  const pending = useRef(false);
  const [referenceTime, setReferenceTime] = useState(() => clock.now());
  useFocusEffect(
    useCallback(() => {
      setReferenceTime(clock.now());
    }, []),
  );
  const since = useMemo(
    () =>
      filter === 'all'
        ? undefined
        : new Date(referenceTime.getTime() - Number(filter) * 86400000),
    [filter, referenceTime],
  );
  const onBoundsChange = useCallback((next: MapBounds) => {
    setBounds((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();

  useFocusEffect(
    useCallback(() => {
      const current = ++generation.current;
      let active = true;
      pending.current = true;
      setLoading(true);
      setPins([]);
      setCursor(undefined);
      setError(undefined);
      setWarning(undefined);
      // Coalesce region changes while panning instead of querying every movement.
      const timer = setTimeout(() => {
        void appModules.sightingMap.page({ bounds, since }).then((result) => {
          if (!active || current !== generation.current) return;
          if (result.ok) {
            setPins(result.value.sightings);
            setCursor(result.value.nextCursor);
            setWarning(
              result.warnings.map(({ message }) => message).join(' ') ||
                undefined,
            );
          } else setError(result.error.message);
          pending.current = false;
          setLoading(false);
        });
      }, 250);
      return () => {
        active = false;
        clearTimeout(timer);
        ++generation.current;
      };
    }, [
      currentUser?.id,
      currentUser?.role,
      currentUser?.clubId,
      bounds,
      since,
    ]),
  );

  const loadMore = async () => {
    if (pending.current) return;
    pending.current = true;
    const current = generation.current;
    setLoading(true);
    setError(undefined);
    setWarning(undefined);
    const result = await appModules.sightingMap.page({ bounds, since, cursor });
    if (current !== generation.current) return;
    if (result.ok) {
      setPins((previous) =>
        Array.from(
          new Map(
            [...previous, ...result.value.sightings].map((item) => [
              item.id,
              item,
            ]),
          ).values(),
        ),
      );
      setCursor(result.value.nextCursor);
      setWarning(
        result.warnings.map(({ message }) => message).join(' ') || undefined,
      );
    } else setError(result.error.message);
    pending.current = false;
    setLoading(false);
  };
  const mappablePins = pins.filter(({ location }) => location !== null);

  return (
    <Screen
      fullBleed
      floatingActionBottom={floatingTabBarContentInset(insets.bottom)}
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Report a sighting"
          accessibilityHint="Opens the new sighting report form"
          style={{
            backgroundColor: theme.colors.coral,
            borderColor: theme.colors.coral,
          }}
          onPress={() => router.push('/map/sightings/new')}
        />
      }
    >
      <View style={{ flex: 1 }}>
        <SightingMapView
          list={mappablePins}
          filter={() => true}
          style={{ flex: 1 }}
          appearance={theme.dark ? 'dark' : 'light'}
          onBoundsChange={onBoundsChange}
          initialViewport={createCampusOverviewViewport()}
          onPerMarkerPress={(pin) =>
            router.push({
              pathname: '/map/sightings/[id]',
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
          <GlassSurface
            testID="sighting-age-glass-bar"
            style={[
              theme.elevation.floating,
              {
                alignSelf: 'stretch',
                padding: theme.spacing.xs,
                borderRadius: theme.radii.sheet,
                borderWidth: 1,
                borderColor: theme.colors.glassBorder,
                backgroundColor: 'transparent',
              },
            ]}
          >
            <SegmentedControl
              label="Sighting age"
              variant="segment"
              value={filter}
              options={[
                { value: '7', label: '7D' },
                { value: '30', label: '30D' },
                { value: '90', label: '90D' },
                { value: '365', label: '1Y' },
                { value: 'all', label: 'All' },
              ]}
              style={{
                justifyContent: 'center',
                flexWrap: 'nowrap',
                gap: theme.spacing.xxs,
              }}
              optionStyle={{
                flex: 1,
                paddingHorizontal: theme.spacing.xxs,
                borderRadius: theme.radii.card,
              }}
              onChange={setFilter}
            />
          </GlassSurface>
          <StatusPill
            label={
              loading
                ? 'Loading sightings'
                : `${mappablePins.length} ${mappablePins.length === 1 ? 'sighting' : 'sightings'} loaded in this area${cursor ? ' · more available' : ''}`
            }
            tone="neutral"
            icon="paw"
            loading={loading}
          />
          {cursor || error ? (
            <Button
              label={error ? 'Retry map loading' : 'Load more sightings'}
              loading={loading}
              onPress={() => void loadMore()}
            />
          ) : null}
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          {warning ? <FeedbackBanner message={warning} tone="warning" /> : null}
        </View>
      </View>
    </Screen>
  );
};

export default HomeScreen;
