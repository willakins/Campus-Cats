import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CatalogRecord } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { AppText, Card } from '@/presentation/ui';
import { ProgressiveImage } from '@/presentation/ui/ProgressiveImage';
import { useAppTheme } from '@/theme';

export const ProfileFavoriteCatCard = ({
  entry,
  photo,
  onPress,
}: {
  readonly entry: CatalogRecord;
  readonly photo?: DisplayMediaAsset;
  readonly onPress: () => void;
}) => {
  const theme = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const imageStyle = {
    width: stacked ? ('100%' as const) : 96,
    height: stacked ? 160 : 96,
    flexShrink: 0,
    borderRadius: theme.radii.field,
  };
  return (
    <Card
      accessibilityLabel={`View favorite cat ${entry.cat.name}`}
      onPress={onPress}
      style={{ gap: theme.spacing.sm }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        }}
      >
        <Ionicons name="heart" size={16} color={theme.colors.coral} />
        <AppText variant="label" color="muted">
          Favorite cat
        </AppText>
      </View>
      <View
        style={{
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'stretch' : 'center',
          gap: theme.spacing.md,
        }}
      >
        {photo ? (
          <ProgressiveImage
            accessibilityLabel={`${entry.cat.name} profile photo`}
            uri={photo.url}
            style={imageStyle}
          />
        ) : (
          <View
            style={[
              imageStyle,
              {
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.goldSurface,
              },
            ]}
          >
            <Ionicons name="paw" size={36} color={theme.colors.gold} />
          </View>
        )}
        <View
          style={{
            flex: stacked ? undefined : 1,
            minWidth: 0,
            gap: theme.spacing.xs,
          }}
        >
          <AppText variant="section">{entry.cat.name}</AppText>
          {entry.cat.descShort ? (
            <AppText color="muted" numberOfLines={3}>
              {entry.cat.descShort}
            </AppText>
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: theme.spacing.xxs,
            }}
          >
            <AppText variant="caption" color="primary">
              View cat profile
            </AppText>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={theme.colors.primary}
            />
          </View>
        </View>
      </View>
    </Card>
  );
};
