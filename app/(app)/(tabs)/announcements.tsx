import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import {
  AccessBanner,
  AppHeader,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  Screen,
} from '@/components/design';
import { AnnouncementItem } from '@/components/items/AnnouncementItem';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import { appModules } from '@/composition/appModules';
import { Announcement, canManageFeature } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const Announcements = () => {
  const { user } = useAuth();
  const theme = useAppTheme();
  const isAdmin = canManageFeature(user.role);
  const [announcements, setAnnouncements] = useState<readonly Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const result = await appModules.announcements.list();
    if (result.ok) setAnnouncements(result.value);
    else setError(result.error.message);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      floatingAction={isAdmin ? (
        <FloatingActionButton
          accessibilityLabel="Create announcement"
          accessibilityHint="Opens the new announcement form"
          onPress={() => router.push('/announcements/create-ann')}
        />
      ) : undefined}
    >
      <AppHeader title="Announcements" eyebrow="Campus Cats updates" />
      <View style={{ paddingBottom: theme.spacing.md }}>
        <AccessBanner
          title="Announcement access"
          message="Everyone can read club updates. Only officers can publish or edit announcements."
        />
      </View>
      {loading ? (
        <CardListSkeleton label="Loading announcements" />
      ) : (
        <FlatList
          {...virtualizedListPerformanceProps}
          data={error ? [] : announcements}
          keyExtractor={(announcement) => announcement.id}
          contentContainerStyle={{
            flexGrow: 1,
            gap: theme.spacing.md,
            paddingBottom: isAdmin ? theme.spacing.huge * 2 : theme.spacing.md,
          }}
          renderItem={({ item }) => <AnnouncementItem {...item} />}
          ListEmptyComponent={error ? (
            <ErrorState title="Updates are unavailable" message={error} onRetry={() => void load()} />
          ) : (
            <EmptyState
              title="No announcements yet"
              message="Club news and volunteer updates will appear here."
            />
          )}
        />
      )}
    </Screen>
  );
};

export default Announcements;
