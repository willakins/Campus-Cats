import React from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { Announcement } from '@/core/domain';
import { useAppTheme } from '@/theme';
import { AppText, Card } from '../design';

export const AnnouncementItem: React.FC<Announcement> = (announcement) => {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <Card
      accessibilityLabel={`Read announcement: ${announcement.title}`}
      accent={theme.colors.gold}
      onPress={() =>
        router.push({
          pathname: '/announcements/view-ann',
          params: { id: announcement.id },
        })
      }
    >
      <View style={{ gap: theme.spacing.xs }}>
        <AppText variant="caption" color="primary">
          {announcement.createdAt.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </AppText>
        <AppText variant="cardTitle">{announcement.title}</AppText>
        <AppText color="muted" numberOfLines={3}>{announcement.info}</AppText>
        {announcement.authorAlias ? (
          <AppText variant="caption" color="muted">By {announcement.authorAlias}</AppText>
        ) : null}
      </View>
    </Card>
  );
};

export default AnnouncementItem;
