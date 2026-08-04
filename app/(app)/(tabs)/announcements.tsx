import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { AppHeader, Button, EmptyState, ErrorState, Screen, Skeleton } from '@/components/design';
import { AnnouncementItem } from '@/components/items/AnnouncementItem';
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
      footer={isAdmin ? (
        <Button
          label="Create announcement"
          icon="add"
          fullWidth
          onPress={() => router.push('/announcements/create-ann')}
        />
      ) : undefined}
    >
      <AppHeader title="Announcements" eyebrow="Campus Cats updates" />
      {loading ? (
        <View style={{ gap: theme.spacing.md }}>
          <Skeleton label="Loading announcements" />
          <Skeleton label="Loading another announcement" />
        </View>
      ) : (
        <FlatList
          data={error ? [] : announcements}
          keyExtractor={(announcement) => announcement.id}
          contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.md, paddingBottom: theme.spacing.md }}
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
