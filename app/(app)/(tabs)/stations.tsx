import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AppText,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  SearchField,
  SegmentedControl,
} from '@/components/design';
import { RestrictedScreen } from '@/components/access';
import { StationItem } from '@/components/items/StationItem';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  roleAccessPolicies,
  Station,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type StationFilter = 'All' | 'Stocked' | 'Unstocked';

const Stations = () => {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const isAdmin = canAccessRolePolicy(
    user.role,
    roleAccessPolicies.manageStations,
  );
  const [stations, setStations] = useState<readonly Station[]>([]);
  const [filter, setFilter] = useState<StationFilter>('All');
  const [query, setQuery] = useState('');
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

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredStations = stations.filter((station) => {
    const { isStocked } = appModules.stations.stockStatus(station);
    if (filter === 'Stocked') return isStocked;
    if (filter === 'Unstocked') return !isStocked;
    return true;
  }).filter((station) =>
    !normalizedQuery ||
    station.name.toLocaleLowerCase().includes(normalizedQuery) ||
    station.knownCats.toLocaleLowerCase().includes(normalizedQuery),
  );

  return (
    <RestrictedScreen
      title="Feeding stations"
      eyebrow="Officer operations"
      access={{ policy: roleAccessPolicies.manageStations, role: user.role }}
      floatingAction={(
        <FloatingActionButton
          accessibilityLabel="Create station"
          accessibilityHint="Opens the new feeding station form"
          onPress={() => router.push('/stations/create-station')}
        />
      )}
    >
      <View style={{ gap: theme.spacing.md, flex: 1 }}>
        <SearchField
          accessibilityLabel="Search feeding stations"
          placeholder="Search stations or known cats"
          value={query}
          onChangeText={setQuery}
        />
        <SegmentedControl
          label="Station stock filter"
          value={filter}
          options={[
            { value: 'All', label: 'All' },
            { value: 'Stocked', label: 'Stocked' },
            { value: 'Unstocked', label: 'Unstocked' },
          ]}
          onChange={setFilter}
        />
        {!loading && !error ? (
          <AppText color="muted" variant="caption" accessibilityLiveRegion="polite">
            {filteredStations.length} {filteredStations.length === 1 ? 'station' : 'stations'}
          </AppText>
        ) : null}
        {loading ? (
          <CardListSkeleton
            label="Loading feeding stations"
            layout="leading"
          />
        ) : (
          <FlatList
            {...virtualizedListPerformanceProps}
            data={error ? [] : filteredStations}
            keyExtractor={(station) => station.id}
            contentContainerStyle={{
              flexGrow: 1,
              gap: theme.spacing.md,
              paddingBottom: theme.spacing.huge * 2,
            }}
            renderItem={({ item }) => (
              <StationItem station={item} status={appModules.stations.stockStatus(item)} />
            )}
            ListEmptyComponent={error ? (
              <ErrorState title="Stations are unavailable" message={error} onRetry={() => void load()} />
            ) : (
              <EmptyState
                title={query ? 'No matching stations' : filter === 'All' ? 'No stations yet' : `No ${filter.toLowerCase()} stations`}
                message={query ? 'Try another search or stock filter.' : 'Try another filter or add a feeding station.'}
              />
            )}
          />
        )}
      </View>
    </RestrictedScreen>
  );
};

export default Stations;
