import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  CatalogSort,
  catalogSortOptions,
} from '@/features/catalog';
import { useAppTheme } from '@/theme';
import { AppText, Button, IconButton } from '../design';

interface CatalogToolbarProps {
  readonly query: string;
  readonly sort: CatalogSort;
  readonly resultCount?: number;
  readonly onQueryChange: (query: string) => void;
  readonly onSortChange: (sort: CatalogSort) => void;
}

export const CatalogToolbar = ({
  query,
  sort,
  resultCount,
  onQueryChange,
  onSortChange,
}: CatalogToolbarProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const selectedSort =
    catalogSortOptions.find(({ value }) => value === sort) ??
    catalogSortOptions[0];

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        <View
          style={{
            flex: 1,
            minHeight: theme.layout.minTouchTarget,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            paddingHorizontal: theme.spacing.sm,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? theme.colors.primary : theme.colors.border,
            borderRadius: theme.radii.field,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons name="search" size={20} color={theme.colors.textMuted} />
          <TextInput
            accessibilityLabel="Search cat profiles"
            placeholder="Search cats"
            value={query}
            onChangeText={onQueryChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.primary}
            style={[
              theme.typography.body,
              {
                flex: 1,
                minWidth: 0,
                height: theme.layout.minTouchTarget,
                color: theme.colors.text,
                outlineWidth: 0,
              },
            ]}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear catalog search"
              hitSlop={8}
              onPress={() => onQueryChange('')}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <IconButton
          icon="swap-vertical"
          accessibilityLabel={`Sort catalog. Current: ${selectedSort.label}`}
          variant="primary"
          onPress={() => setSortOpen(true)}
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
          Sorted by {selectedSort.label.toLocaleLowerCase()}
        </AppText>
        {resultCount !== undefined ? (
          <AppText variant="caption" color="muted" accessibilityLiveRegion="polite">
            {resultCount} {resultCount === 1 ? 'cat' : 'cats'}
          </AppText>
        ) : null}
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
            accessibilityLabel="Close sort options"
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
          </View>
        </View>
      </Modal>
    </View>
  );
};
