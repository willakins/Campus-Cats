import React from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { LocalSightingRecord } from '../../core/domain';
import { useAppTheme } from '../../theme';
import { AppText, Card } from '../design';

export const ProfileSightingItem = React.memo(function ProfileSightingItem({
  sighting,
}: {
  readonly sighting: LocalSightingRecord;
}) {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <Card
      accessibilityLabel={`View sighting of ${sighting.name}`}
      onPress={() =>
        router.push({
          pathname: '/sighting/view-sighting',
          params: { id: sighting.id },
        })
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radii.field,
            backgroundColor: theme.colors.coralSurface,
          }}
        >
          <Ionicons name="paw" size={28} color={theme.colors.coral} />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText variant="cardTitle">{sighting.name}</AppText>
          <AppText color="muted">
            {sighting.date.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </AppText>
          {sighting.info ? (
            <AppText color="muted" numberOfLines={2}>
              {sighting.info}
            </AppText>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textMuted}
        />
      </View>
    </Card>
  );
});
