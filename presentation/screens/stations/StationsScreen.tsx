import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AppText,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  SearchField,
  SegmentedControl,
} from '@/presentation/ui';
import { RestrictedScreen } from '@/presentation/access';
import { StationListItem } from '@/presentation/screens/stations/components/StationListItem';
import { useFocusTask } from '@/presentation/hooks/useFocusTask';
import { virtualizedListPerformanceProps } from '@/presentation/patterns/lists/virtualizedListPerformance';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  roleAccessPolicies,
  Station,
} from '@/core/domain';
import { useAuth } from '@/presentation/providers';
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

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    if (!isAdmin) return;
    setLoading(true);
    setError(undefined);
    const result = await appModules.stations.list();
    if (!isActive()) return;
    if (result.ok) setStations(result.value);
    else setError(result.error.message);
    setLoading(false);
  }, [isAdmin]);

  useFocusTask(load);

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
          onPress={() => router.push('/stations/new')}
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
          variant="segment"
          style={{
            flexWrap: 'nowrap',
            gap: theme.spacing.xxs,
            padding: theme.spacing.xxs,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.card,
            backgroundColor: theme.colors.surface,
          }}
          optionStyle={{ flex: 1, paddingHorizontal: theme.spacing.xxs }}
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
              <StationListItem station={item} status={appModules.stations.stockStatus(item)} />
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
