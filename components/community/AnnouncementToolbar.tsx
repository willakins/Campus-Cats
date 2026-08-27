import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { AppText, Button, IconButton, SearchField } from '../design';

export type AnnouncementSort = 'most-recent' | 'least-recent';

interface AnnouncementToolbarProps {
  readonly query: string;
  readonly sort: AnnouncementSort;
  readonly onQueryChange: (query: string) => void;
  readonly onSortChange: (sort: AnnouncementSort) => void;
}

const sortOptions: readonly {
  readonly value: AnnouncementSort;
  readonly label: string;
}[] = [
  { value: 'most-recent', label: 'Most recent' },
  { value: 'least-recent', label: 'Least recent' },
];

export const AnnouncementToolbar = ({
  query,
  sort,
  onQueryChange,
  onSortChange,
}: AnnouncementToolbarProps) => {
  const theme = useAppTheme();
  const [sortOpen, setSortOpen] = useState(false);
  const selectedSort =
    sortOptions.find(({ value }) => value === sort) ?? sortOptions[0];

  return (
    <>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        <View style={{ flex: 1 }}>
          <SearchField
            value={query}
            onChangeText={onQueryChange}
            accessibilityLabel="Search announcements by title"
            placeholder="Search by title"
          />
        </View>
        <IconButton
          icon="swap-vertical"
          accessibilityLabel={`Sort announcements. Current: ${selectedSort.label}`}
          variant="primary"
          onPress={() => setSortOpen(true)}
        />
      </View>

      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <View
          accessibilityViewIsModal
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: theme.colors.overlay,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close announcement sort options"
            onPress={() => setSortOpen(false)}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View
            style={{
              width: '100%',
              maxWidth: theme.layout.maxContentWidth,
              alignSelf: 'center',
              gap: theme.spacing.sm,
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xxl,
              borderTopLeftRadius: theme.radii.sheet,
              borderTopRightRadius: theme.radii.sheet,
              backgroundColor: theme.colors.surface,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="section">Sort announcements</AppText>
                <AppText color="muted">
                  Choose how announcements are ordered.
                </AppText>
              </View>
              <IconButton
                icon="close"
                accessibilityLabel="Close announcement sort options"
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
          </View>
        </View>
      </Modal>
    </>
  );
};
