import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import { appModules } from '@/composition/appModules';
import { CatalogEntry } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAppTheme } from '@/theme';
import { AppText, Card } from '../design';

export const CatalogItem: React.FC<CatalogEntry> = (entry) => {
  const router = useRouter();
  const theme = useAppTheme();
  const [profile, setProfile] = useState<StoredMediaAsset>();

  useEffect(() => {
    void appModules.catalog.media(entry.id).then((result) => {
      if (result.ok) {
        setProfile(result.value.find(({ role }) => role === 'profile'));
      }
    });
  }, [entry.id]);

  return (
    <Card
      accessibilityLabel={`View cat: ${entry.cat.name}`}
      style={{ flex: 1, padding: 0 }}
      onPress={() =>
        router.push({ pathname: '/catalog/view-entry', params: { id: entry.id } })
      }
    >
      {profile ? (
        <Image
          accessibilityLabel={`${entry.cat.name} profile photo`}
          source={{ uri: profile.url }}
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
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xxs }}>
        <AppText variant="cardTitle">{entry.cat.name}</AppText>
        <AppText color="muted" numberOfLines={2}>{entry.cat.descShort}</AppText>
      </View>
    </Card>
  );
};

export default CatalogItem;
