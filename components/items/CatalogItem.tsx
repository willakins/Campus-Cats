import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import { appModules } from '@/composition/appModules';
import { CatalogRecord, CatalogTag } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, Card, IconButton, Skeleton, StatusPill } from '../design';
import { ProgressiveImage } from '../ui/ProgressiveImage';

interface CatalogItemMetrics {
  readonly sightingCount?: number;
  readonly mostRecentSighting?: Date;
  readonly heartCount?: number;
  readonly isFavorite?: boolean;
  readonly favoriteBusy?: boolean;
  readonly onToggleFavorite?: () => void;
  readonly tags?: readonly CatalogTag[];
}

type CatalogItemProps = CatalogRecord & CatalogItemMetrics;

export const CatalogItem = React.memo(function CatalogItem({
  sightingCount = 0,
  mostRecentSighting,
  heartCount = 0,
  isFavorite = false,
  favoriteBusy = false,
  onToggleFavorite,
  tags = [],
  ...entry
}: CatalogItemProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const [profile, setProfile] = useState<DisplayMediaAsset>();
  const [mediaLoading, setMediaLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setMediaLoading(true);
    void appModules.catalog.media(entry.id).then((result) => {
      if (active && result.ok) {
        setProfile(result.value.find(({ role }) => role === 'profile'));
      }
      if (active) setMediaLoading(false);
    });
    return () => {
      active = false;
    };
  }, [entry.id]);

  return (
    <Card style={{ flex: 1, padding: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View cat: ${entry.cat.name}`}
        onPress={() =>
          router.push({ pathname: '/catalog/view-entry', params: { id: entry.id } })
        }
        style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.86 : 1 })}
      >
        {mediaLoading ? (
          <Skeleton
            label={`Loading ${entry.cat.name} profile photo`}
            height="auto"
            shapeStyle={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 0 }}
          />
        ) : profile ? (
          <ProgressiveImage
            accessibilityLabel={`${entry.cat.name} profile photo`}
            uri={profile.url}
            style={{ width: '100%', aspectRatio: 4 / 3 }}
            resizeMode="cover"
          />
        ) : (
          <View
            accessibilityLabel={`No profile photo for ${entry.cat.name}`}
            style={{
              width: '100%',
              aspectRatio: 4 / 3,
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.xs,
              backgroundColor: theme.colors.tealSurface,
            }}
          >
            <Ionicons name="paw-outline" size={36} color={theme.colors.teal} />
            <AppText variant="caption" color="muted">No profile photo</AppText>
          </View>
        )}
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
          <AppText variant="cardTitle">{entry.cat.name}</AppText>
          <AppText color="muted" numberOfLines={2}>{entry.cat.descShort}</AppText>
          {tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
              {tags.map((tag) => (
                <StatusPill
                  key={tag.id}
                  label={tag.label}
                  tone={catalogTagTone(tag.id)}
                />
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <Metric
              icon="eye-outline"
              label={`${sightingCount} ${sightingCount === 1 ? 'sighting' : 'sightings'}`}
            />
            <Metric
              icon="heart"
              label={`${heartCount} ${heartCount === 1 ? 'heart' : 'hearts'}`}
            />
            {mostRecentSighting ? (
              <Metric
                icon="time-outline"
                label={mostRecentSighting.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              />
            ) : null}
          </View>
        </View>
      </Pressable>
      {onToggleFavorite ? (
        <IconButton
          icon={isFavorite ? 'heart' : 'heart-outline'}
          accessibilityLabel={
            isFavorite
              ? `Remove ${entry.cat.name} as your favorite cat`
              : `Choose ${entry.cat.name} as your favorite cat`
          }
          accessibilityState={{ checked: isFavorite, busy: favoriteBusy }}
          disabled={favoriteBusy}
          variant={isFavorite ? 'primary' : 'surface'}
          onPress={onToggleFavorite}
          style={{
            position: 'absolute',
            top: theme.spacing.sm,
            right: theme.spacing.sm,
          }}
        />
      ) : null}
    </Card>
  );
});

const Metric = ({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) => {
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
      <Ionicons name={icon} size={15} color={theme.colors.textMuted} />
      <AppText variant="caption" color="muted">{label}</AppText>
    </View>
  );
};

export default CatalogItem;

const catalogTagTone = (
  tagId: string,
): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  if (tagId === 'adopted') return 'success';
  if (tagId === 'tnr-complete') return 'primary';
  if (tagId === 'needs-tnr') return 'warning';
  if (tagId === 'deceased') return 'neutral';
  return 'info';
};
