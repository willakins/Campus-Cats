import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AccessDeniedState,
  AppHeader,
  Button,
  EmptyState,
  ErrorState,
  Screen,
  SegmentedControl,
  Skeleton,
} from '@/components/design';
import { StationItem } from '@/components/items/StationItem';
import { appModules } from '@/composition/appModules';
import { canManageFeature, Station } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type StationFilter = 'All' | 'Stocked' | 'Unstocked';

const Stations = () => {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const isAdmin = canManageFeature(user.role);
  const [stations, setStations] = useState<readonly Station[]>([]);
  const [filter, setFilter] = useState<StationFilter>('All');
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(undefined);
    const result = await appModules.stations.list();
    if (result.ok) setStations(result.value);
    else setError(result.error.message);
    setLoading(false);
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isAdmin) {
    return (
      <Screen>
        <AppHeader title="Feeding stations" eyebrow="Officer tools" />
        <AccessDeniedState message="Officer access is required to view feeding-station operations." />
      </Screen>
    );
  }

  const filteredStations = stations.filter((station) => {
    const { isStocked } = appModules.stations.stockStatus(station);
    if (filter === 'Stocked') return isStocked;
    if (filter === 'Unstocked') return !isStocked;
    return true;
  });

  return (
    <Screen
      footer={(
        <Button
          label="Create station"
          icon="add"
          fullWidth
          onPress={() => router.push('/stations/create-station')}
        />
      )}
    >
      <AppHeader title="Feeding stations" eyebrow="Officer operations" />
      <View style={{ gap: theme.spacing.md, flex: 1 }}>
        <SegmentedControl
          label="Station stock filter"
          value={filter}
          options={[
            { value: 'Stocked', label: 'Stocked' },
            { value: 'Unstocked', label: 'Unstocked' },
            { value: 'All', label: 'All' },
          ]}
          onChange={setFilter}
        />
        {loading ? (
          <View style={{ gap: theme.spacing.md }}>
            <Skeleton label="Loading feeding stations" />
            <Skeleton label="Loading another feeding station" />
          </View>
        ) : (
          <FlatList
            data={error ? [] : filteredStations}
            keyExtractor={(station) => station.id}
            contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.md, paddingBottom: theme.spacing.md }}
            renderItem={({ item }) => (
              <StationItem station={item} status={appModules.stations.stockStatus(item)} />
            )}
            ListEmptyComponent={error ? (
              <ErrorState title="Stations are unavailable" message={error} onRetry={() => void load()} />
            ) : (
              <EmptyState
                title={filter === 'All' ? 'No stations yet' : `No ${filter.toLowerCase()} stations`}
                message="Try another filter or add a feeding station."
              />
            )}
          />
        )}
      </View>
    </Screen>
  );
};

export default Stations;
