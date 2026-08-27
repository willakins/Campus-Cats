import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CatalogRecord } from '@/core/domain';
import { useAppTheme } from '@/theme';
import {
  AppHeader,
  AppText,
  Button,
  CardListSkeleton,
  EmptyState,
  FeedbackBanner,
  Screen,
  SearchField,
  StatusPill,
} from '@/components/design';
import {
  catalogCardWidth,
  catalogColumnCount,
} from '@/components/collections/catalogLayout';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import { CatalogItem } from '@/components/items/CatalogItem';
import { FormTextInput } from './FormControls';

interface CatalogCatFieldProps {
  readonly value: string;
  readonly entries: readonly CatalogRecord[];
  readonly loading: boolean;
  readonly error?: string;
  readonly validationError?: string;
  readonly onChange: (name: string) => void;
}

export const CatalogCatField = ({
  value,
  entries,
  loading,
  error,
  validationError,
  onChange,
}: CatalogCatFieldProps) => {
  const theme = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const query = value.trim();
  const selectedEntry = entries.find(
    ({ cat }) => normalize(cat.name) === normalize(query),
  );
  const suggestions = useMemo(
    () => filterCatalog(entries, query).slice(0, 5),
    [entries, query],
  );
  const visibleCatalog = useMemo(
    () => filterCatalog(entries, catalogQuery),
    [catalogQuery, entries],
  );
  const columns = catalogColumnCount(width, fontScale);
  const cardWidth = catalogCardWidth(
    width,
    columns,
    theme.layout.screenGutter,
    theme.layout.maxContentWidth,
    theme.spacing.md,
  );

  const selectCatalogCat = (entry: CatalogRecord) => {
    onChange(entry.cat.name);
    setSuggestionsOpen(false);
    setCatalogOpen(false);
    setCatalogQuery('');
  };

  const selectNewCat = (name: string) => {
    onChange(name.trim());
    setSuggestionsOpen(false);
    setCatalogOpen(false);
    setCatalogQuery('');
  };

  return (
    <>
      <View style={{ gap: theme.spacing.xs }}>
        <FormTextInput
          label="Cat name"
          required
          error={validationError}
          value={value}
          placeholder="Search catalog or enter a new cat"
          autoCapitalize="words"
          autoCorrect={false}
          onFocus={() => setSuggestionsOpen(true)}
          onChangeText={(name) => {
            onChange(name);
            setSuggestionsOpen(true);
          }}
        />
        {suggestionsOpen && query ? (
          <View
            accessibilityLabel="Cat name options"
            style={{
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.field,
              backgroundColor: theme.colors.surface,
            }}
          >
            {suggestions.map((entry) => (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityLabel={`Select catalog cat ${entry.cat.name}`}
                onPress={() => selectCatalogCat(entry)}
                style={({ pressed }) => ({
                  minHeight: theme.layout.minTouchTarget,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  backgroundColor: pressed
                    ? theme.colors.primarySurface
                    : theme.colors.surface,
                })}
              >
                <Ionicons name="paw-outline" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <AppText variant="label">{entry.cat.name}</AppText>
                  <AppText variant="caption" color="muted" numberOfLines={1}>
                    {entry.cat.descShort}
                  </AppText>
                </View>
                <StatusPill label="Catalog" tone="primary" />
              </Pressable>
            ))}
            {!selectedEntry ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Use ${query} as a new cat`}
                onPress={() => selectNewCat(query)}
                style={({ pressed }) => ({
                  minHeight: theme.layout.minTouchTarget,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs,
                  backgroundColor: pressed
                    ? theme.colors.primarySurface
                    : theme.colors.surface,
                })}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.coral} />
                <View style={{ flex: 1 }}>
                  <AppText variant="label">New cat: “{query}”</AppText>
                  <AppText variant="caption" color="muted">
                    Use this name without linking a catalog profile.
                  </AppText>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : selectedEntry ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <StatusPill label="Catalog cat selected" tone="success" icon="checkmark-circle" />
            <AppText variant="caption" color="muted" style={{ flex: 1 }}>
              This report will appear with {selectedEntry.cat.name}’s sightings.
            </AppText>
          </View>
        ) : null}
        <Button
          label={loading ? 'Loading cat catalog…' : 'Browse cat catalog'}
          icon="images-outline"
          variant="secondary"
          disabled={loading || entries.length === 0}
          onPress={() => setCatalogOpen(true)}
        />
        {error ? (
          <FeedbackBanner
            tone="warning"
            message={`${error} You can still enter a new cat name.`}
          />
        ) : null}
      </View>

      <Modal
        visible={catalogOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCatalogOpen(false)}
      >
        <Screen>
          <AppHeader
            title="Choose a cat"
            eyebrow="Cat catalog"
            onBack={() => setCatalogOpen(false)}
          />
          <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
            <SearchField
              accessibilityLabel="Search cats to report"
              placeholder="Search by name or description"
              value={catalogQuery}
              onChangeText={setCatalogQuery}
            />
            <AppText color="muted">
              Select a profile to use its exact name in this sighting report.
            </AppText>
            {catalogQuery.trim() && !visibleCatalog.some(
              ({ cat }) => normalize(cat.name) === normalize(catalogQuery),
            ) ? (
              <Button
                label={`Use “${catalogQuery.trim()}” as a new cat`}
                icon="add-circle-outline"
                variant="secondary"
                onPress={() => selectNewCat(catalogQuery)}
              />
            ) : null}
          </View>
          {loading ? (
            <CardListSkeleton
              label="Loading cats to choose"
              count={columns * 2}
              columns={columns}
              layout="cover"
            />
          ) : (
            <FlatList
              {...virtualizedListPerformanceProps}
              key={`cat-picker-${columns}`}
              data={visibleCatalog}
              numColumns={columns}
              keyExtractor={({ id }) => id}
              contentContainerStyle={{
                flexGrow: 1,
                gap: theme.spacing.md,
                paddingBottom: theme.spacing.xl,
              }}
              columnWrapperStyle={columns > 1 ? { gap: theme.spacing.md } : undefined}
              renderItem={({ item }) => (
                <View style={{ width: cardWidth, minWidth: 0 }}>
                  <CatalogItem
                    {...item}
                    accessibilityLabel={`Select ${item.cat.name} for this sighting`}
                    onPress={() => selectCatalogCat(item)}
                  />
                </View>
              )}
              ListEmptyComponent={(
                <EmptyState
                  title="No matching cats"
                  message="Try another search, or use the new-cat option above."
                />
              )}
            />
          )}
        </Screen>
      </Modal>
    </>
  );
};

const filterCatalog = (
  entries: readonly CatalogRecord[],
  query: string,
): readonly CatalogRecord[] => {
  const normalizedQuery = normalize(query);
  return [...entries]
    .filter(({ cat }) =>
      !normalizedQuery ||
      normalize(`${cat.name} ${cat.descShort}`).includes(normalizedQuery),
    )
    .sort((left, right) => left.cat.name.localeCompare(right.cat.name));
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();
