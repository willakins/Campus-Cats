import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appModules } from '@/composition/appModules';
import {
  AppHeader,
  AppText,
  Button,
  EmptyState,
  Screen,
  SearchField,
} from '@/presentation/ui';
import {
  catalogCardWidth,
  catalogColumnCount,
} from '@/presentation/patterns/catalog/catalogLayout';
import { virtualizedListPerformanceProps } from '@/presentation/patterns/lists/virtualizedListPerformance';
import { CatalogListItem } from '@/presentation/patterns/catalog/CatalogListItem';
import { CatalogRecord } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { ProgressiveImage } from '@/presentation/ui/ProgressiveImage';

interface FavoriteCatFieldProps {
  readonly value: string;
  readonly entries: readonly CatalogRecord[];
  readonly onChange: (catalogId: string) => void;
}

export const FavoriteCatField = ({
  value,
  entries,
  onChange,
}: FavoriteCatFieldProps) => {
  const theme = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<DisplayMediaAsset>();
  const selected = entries.find(({ id }) => id === value);
  const visibleEntries = useMemo(
    () => filterCatalog(entries, query),
    [entries, query],
  );
  const columns = catalogColumnCount(width, fontScale);
  const cardWidth = catalogCardWidth(
    width,
    columns,
    theme.layout.screenGutter,
    theme.layout.maxContentWidth,
    theme.spacing.md,
  );

  useEffect(() => {
    let active = true;
    setSelectedPhoto(undefined);
    if (!selected) {
      return () => {
        active = false;
      };
    }

    void appModules.catalog.media(selected.id).then((result) => {
      if (active && result.ok) {
        setSelectedPhoto(result.value.find(({ role }) => role === 'profile'));
      }
    });
    return () => {
      active = false;
    };
  }, [selected]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="label">Favorite cat</AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
          }}
        >
          <View
            style={{
              width: 112,
              flexShrink: 0,
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            {selected ? (
              <>
                {selectedPhoto ? (
                  <ProgressiveImage
                    accessibilityLabel={`${selected.cat.name} profile photo`}
                    uri={selectedPhoto.url}
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: theme.radii.card,
                    }}
                  />
                ) : (
                  <View
                    accessibilityLabel={`No profile photo for ${selected.cat.name}`}
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: theme.radii.card,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.tealSurface,
                    }}
                  >
                    <Ionicons
                      name="paw-outline"
                      size={36}
                      color={theme.colors.teal}
                    />
                  </View>
                )}
                <AppText variant="cardTitle" style={{ textAlign: 'center' }}>
                  {selected.cat.name}
                </AppText>
              </>
            ) : (
              <>
                <View
                  accessibilityLabel="No favorite cat selected"
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: theme.radii.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.surfaceSubtle,
                  }}
                >
                  <Ionicons
                    name="paw-outline"
                    size={36}
                    color={theme.colors.textMuted}
                  />
                </View>
                <AppText variant="cardTitle" style={{ textAlign: 'center' }}>
                  No cat selected
                </AppText>
              </>
            )}
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: 'flex-start',
              gap: theme.spacing.sm,
            }}
          >
            <AppText color="muted">
              {selected
                ? selected.cat.descShort
                : 'Choose a cat to feature on your profile.'}
            </AppText>
            <Button
              label="Browse Cat-alog"
              icon="images-outline"
              variant="secondary"
              onPress={() => setOpen(true)}
            />
          </View>
        </View>
      </View>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={close}
      >
        <Screen>
          <AppHeader
            title="Choose your favorite cat"
            eyebrow="Cat-alog"
            onBack={close}
          />
          <View
            style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}
          >
            <SearchField
              accessibilityLabel="Search favorite cats"
              placeholder="Search by name or description"
              value={query}
              onChangeText={setQuery}
            />
            <AppText color="muted">
              Choose one catalog profile to feature on your member profile.
            </AppText>
          </View>
          <FlatList
            {...virtualizedListPerformanceProps}
            key={`favorite-cat-picker-${columns}`}
            data={visibleEntries}
            numColumns={columns}
            keyExtractor={({ id }) => id}
            contentContainerStyle={{
              flexGrow: 1,
              gap: theme.spacing.md,
              paddingBottom: theme.spacing.xl,
            }}
            columnWrapperStyle={
              columns > 1 ? { gap: theme.spacing.md } : undefined
            }
            renderItem={({ item }) => (
              <View style={{ width: cardWidth, minWidth: 0 }}>
                <CatalogListItem
                  {...item}
                  selected={item.id === value}
                  accessibilityLabel={`Select ${item.cat.name} as favorite cat`}
                  onPress={() => {
                    onChange(item.id);
                    close();
                  }}
                />
              </View>
            )}
            ListEmptyComponent={
              <EmptyState
                title="No matching cats"
                message="Try another name or description."
              />
            }
          />
        </Screen>
      </Modal>
    </>
  );
};

const filterCatalog = (
  entries: readonly CatalogRecord[],
  query: string,
): readonly CatalogRecord[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return [...entries]
    .filter(({ cat }) =>
      normalizedQuery
        ? `${cat.name} ${cat.descShort}`
            .toLocaleLowerCase()
            .includes(normalizedQuery)
        : true,
    )
    .sort((left, right) => left.cat.name.localeCompare(right.cat.name));
};
