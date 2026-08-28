import React, { useCallback, useState } from 'react';
import { FlatList } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  Screen,
} from '@/components/design';
import { ProfileSightingItem } from '@/components/profile';
import { useFocusTask } from '@/components/hooks/useFocusTask';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import { appModules } from '@/composition/appModules';
import { SightingRecord, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ProfileSightingsScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const actor = parseUser(useAuth().user);
  const { id, displayName } = useLocalSearchParams<{
    id?: string;
    displayName?: string;
  }>();
  const [sightings, setSightings] = useState<readonly SightingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setSightings([]);
    setError(undefined);
    if (!id) {
      setError('Missing member profile ID');
      setLoading(false);
      return;
    }
    const result = await appModules.sightings.listByReporter(actor, id);
    if (!isActive()) return;
    if (result.ok) setSightings(result.value);
    else setError(result.error.message);
    setLoading(false);
  }, [actor.id, actor.role, id]);

  useFocusTask(load);

  const memberName = displayName?.trim() || 'Member';

  return (
    <Screen>
      <AppHeader
        title={`${memberName}’s sightings`}
        eyebrow="Field reports"
        onBack={() => router.back()}
      />
      {loading ? (
        <CardListSkeleton label="Loading member sightings" layout="leading" />
      ) : (
        <FlatList
          {...virtualizedListPerformanceProps}
          data={error ? [] : sightings}
          keyExtractor={(sighting) => sighting.id}
          contentContainerStyle={{
            flexGrow: 1,
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.md,
          }}
          renderItem={({ item }) => <ProfileSightingItem sighting={item} />}
          ListEmptyComponent={
            error ? (
              <ErrorState
                title="Sightings unavailable"
                message={error}
                onRetry={() => void load()}
              />
            ) : (
              <EmptyState
                title="No sightings yet"
                message="This member has not reported a Campus Cats sighting."
              />
            )
          }
        />
      )}
    </Screen>
  );
};

export default ProfileSightingsScreen;
