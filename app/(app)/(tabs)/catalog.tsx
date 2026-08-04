import React, { useCallback, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import { AppHeader, Button, EmptyState, ErrorState, Screen, Skeleton } from '@/components/design';
import { catalogColumnCount } from '@/components/collections/catalogLayout';
import { CatalogItem } from '@/components/items/CatalogItem';
import { appModules } from '@/composition/appModules';
import { canManageFeature, CatalogEntry } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const Catalog = () => {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const isAdmin = canManageFeature(user.role);
  const columns = catalogColumnCount(width, fontScale);
  const [entries, setEntries] = useState<readonly CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const result = await appModules.catalog.list();
    if (result.ok) setEntries(result.value);
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
          label="Create catalog entry"
          icon="add"
          fullWidth
          onPress={() => router.push('/catalog/create-entry')}
        />
      ) : undefined}
    >
      <AppHeader title="Cat catalog" eyebrow="Meet the colony" />
      {loading ? (
        <View style={{ gap: theme.spacing.md }}>
          <Skeleton label="Loading cat cards" />
          <Skeleton label="Loading another cat card" />
        </View>
      ) : (
        <FlatList
          key={`catalog-${columns}`}
          data={error ? [] : entries}
          numColumns={columns}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.md, paddingBottom: theme.spacing.md }}
          columnWrapperStyle={columns > 1 ? { gap: theme.spacing.md } : undefined}
          renderItem={({ item }) => (
            <View style={{ flex: 1, minWidth: 0 }}>
              <CatalogItem {...item} />
            </View>
          )}
          ListEmptyComponent={error ? (
            <ErrorState title="Catalog unavailable" message={error} onRetry={() => void load()} />
          ) : (
            <EmptyState
              title="No cats yet"
              message="Catalog profiles will appear here when officers add them."
            />
          )}
        />
      )}
    </Screen>
  );
};

export default Catalog;
