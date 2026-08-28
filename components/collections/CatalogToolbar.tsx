import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  CatalogSort,
  catalogSortOptions,
} from '@/features/catalog';
import { CatalogTag } from '@/core/domain';
import { useAppTheme } from '@/theme';
import {
  AppText,
  BottomSheet,
  Button,
  Chip,
  IconButton,
  SearchField,
} from '../design';

interface CatalogToolbarProps {
  readonly query: string;
  readonly sort: CatalogSort;
  readonly availableTags: readonly CatalogTag[];
  readonly selectedTagIds: readonly string[];
  readonly resultCount?: number;
  readonly onQueryChange: (query: string) => void;
  readonly onSortChange: (sort: CatalogSort) => void;
  readonly onSelectedTagIdsChange: (tagIds: readonly string[]) => void;
}

export const CatalogToolbar = ({
  query,
  sort,
  availableTags,
  selectedTagIds,
  resultCount,
  onQueryChange,
  onSortChange,
  onSelectedTagIdsChange,
}: CatalogToolbarProps) => {
  const theme = useAppTheme();
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const selectedSort =
    catalogSortOptions.find(({ value }) => value === sort) ??
    catalogSortOptions[0];

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        <View style={{ flex: 1 }}>
          <SearchField
            accessibilityLabel="Search cat profiles"
            clearAccessibilityLabel="Clear catalog search"
            placeholder="Search cats"
            value={query}
            onChangeText={onQueryChange}
          />
        </View>
        <IconButton
          icon="swap-vertical"
          accessibilityLabel={`Sort catalog. Current: ${selectedSort.label}`}
          variant="primary"
          onPress={() => setSortOpen(true)}
        />
        <IconButton
          icon={selectedTagIds.length > 0 ? 'filter' : 'filter-outline'}
          accessibilityLabel={
            selectedTagIds.length > 0
              ? `Filter catalog. ${selectedTagIds.length} selected`
              : 'Filter catalog'
          }
          variant={selectedTagIds.length > 0 ? 'primary' : 'surface'}
          onPress={() => setFilterOpen(true)}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
        }}
      >
        <AppText variant="caption" color="muted">
          {selectedTagIds.length > 0
            ? `${selectedTagIds.length} ${selectedTagIds.length === 1 ? 'filter' : 'filters'} · `
            : ''}
          Sorted by {selectedSort.label.toLocaleLowerCase()}
        </AppText>
        {resultCount !== undefined ? (
          <AppText variant="caption" color="muted" accessibilityLiveRegion="polite">
            {resultCount} {resultCount === 1 ? 'cat' : 'cats'}
          </AppText>
        ) : null}
      </View>

      <BottomSheet
        visible={sortOpen}
        closeLabel="Close sort options"
        onClose={() => setSortOpen(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <AppText variant="section">Sort cat catalog</AppText>
            <AppText color="muted">Choose how profiles are ordered.</AppText>
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close sort options"
            onPress={() => setSortOpen(false)}
          />
        </View>
        {catalogSortOptions.map((option) => {
          const selected = option.value === sort;
          return (
            <Button
              key={option.value}
              label={option.label}
              icon={selected ? 'checkmark-circle' : 'ellipse-outline'}
              variant={selected ? 'primary' : 'secondary'}
              accessibilityState={{ selected }}
              fullWidth
              onPress={() => {
                onSortChange(option.value);
                setSortOpen(false);
              }}
            />
          );
        })}
      </BottomSheet>

      <BottomSheet
        visible={filterOpen}
        closeLabel="Close filter options"
        onClose={() => setFilterOpen(false)}
        contentStyle={{ gap: theme.spacing.md }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <AppText variant="section">Filter cat catalog</AppText>
            <AppText color="muted">Cats must match every selected tag.</AppText>
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close filter options"
            onPress={() => setFilterOpen(false)}
          />
        </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.xs,
              }}
            >
              {availableTags.map((option) => {
                const selected = selectedTagIds.includes(option.id);
                return (
                  <Chip
                    key={option.id}
                    label={option.label}
                    selected={selected}
                    onPress={() =>
                      onSelectedTagIdsChange(
                        selected
                          ? selectedTagIds.filter((tagId) => tagId !== option.id)
                          : [...selectedTagIds, option.id],
                      )
                    }
                  />
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Clear filters"
                  variant="secondary"
                  fullWidth
                  disabled={selectedTagIds.length === 0}
                  onPress={() => onSelectedTagIdsChange([])}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Show cats"
                  fullWidth
                  onPress={() => setFilterOpen(false)}
                />
              </View>
            </View>
      </BottomSheet>
    </View>
  );
};
