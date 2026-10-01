import React, { useState } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';
import {
  AppText,
  BottomSheet,
  Button,
  IconButton,
  SearchField,
} from '@/presentation/ui';

export type AlertSort = 'most-recent' | 'least-recent';
export type AlertReadFilter = 'all' | 'unread' | 'read';

interface AlertToolbarProps {
  readonly query: string;
  readonly sort: AlertSort;
  readonly readFilter: AlertReadFilter;
  readonly onQueryChange: (query: string) => void;
  readonly onSortChange: (sort: AlertSort) => void;
  readonly onReadFilterChange: (filter: AlertReadFilter) => void;
}

const sortOptions: readonly {
  readonly value: AlertSort;
  readonly label: string;
}[] = [
  { value: 'most-recent', label: 'Most recent' },
  { value: 'least-recent', label: 'Least recent' },
];

const readFilterOptions: readonly {
  readonly value: AlertReadFilter;
  readonly label: string;
}[] = [
  { value: 'all', label: 'All alerts' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

export const AlertToolbar = ({
  query,
  sort,
  readFilter,
  onQueryChange,
  onSortChange,
  onReadFilterChange,
}: AlertToolbarProps) => {
  const theme = useAppTheme();
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const selectedSort =
    sortOptions.find(({ value }) => value === sort) ?? sortOptions[0];
  const selectedReadFilter =
    readFilterOptions.find(({ value }) => value === readFilter) ??
    readFilterOptions[0];

  return (
    <>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        <View style={{ flex: 1 }}>
          <SearchField
            value={query}
            onChangeText={onQueryChange}
            accessibilityLabel="Search alerts by title"
            placeholder="Search by title"
          />
        </View>
        <IconButton
          icon="swap-vertical"
          accessibilityLabel={`Sort alerts. Current: ${selectedSort.label}`}
          variant="primary"
          onPress={() => setSortOpen(true)}
        />
        <IconButton
          icon="filter"
          accessibilityLabel={`Filter alerts. Current: ${selectedReadFilter.label}`}
          variant={readFilter === 'all' ? 'surface' : 'primary'}
          onPress={() => setFilterOpen(true)}
        />
      </View>

      <BottomSheet
        visible={filterOpen}
        closeLabel="Close alert filter options"
        onClose={() => setFilterOpen(false)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="section">Filter alerts</AppText>
            <AppText color="muted">Choose which alerts to show.</AppText>
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close alert filter options"
            onPress={() => setFilterOpen(false)}
          />
        </View>
        {readFilterOptions.map((option) => {
          const selected = option.value === readFilter;
          return (
            <Button
              key={option.value}
              label={option.label}
              icon={selected ? 'checkmark-circle' : 'ellipse-outline'}
              variant={selected ? 'primary' : 'secondary'}
              accessibilityState={{ selected }}
              fullWidth
              onPress={() => {
                onReadFilterChange(option.value);
                setFilterOpen(false);
              }}
            />
          );
        })}
      </BottomSheet>

      <BottomSheet
        visible={sortOpen}
        closeLabel="Close alert sort options"
        onClose={() => setSortOpen(false)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="section">Sort alerts</AppText>
            <AppText color="muted">Choose how alerts are ordered.</AppText>
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close alert sort options"
            onPress={() => setSortOpen(false)}
          />
        </View>
        {sortOptions.map((option) => {
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
    </>
  );
};
