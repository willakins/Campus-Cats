import React from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { Announcement } from '@/core/domain';
import { useAppTheme } from '@/theme';
import { AppText, Card, UnreadIndicator } from '../design';

export const AnnouncementItem = React.memo(function AnnouncementItem(
  announcement: Announcement & { readonly read?: boolean },
) {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <Card
      accessibilityLabel={`${announcement.read ? 'Read' : 'Unread'} announcement: ${announcement.title}`}
      accent={theme.colors.gold}
      style={{ padding: theme.spacing.sm }}
      onPress={() =>
        router.push({
          pathname: '/announcements/view-ann',
          params: { id: announcement.id },
        })
      }
    >
      <View style={{ gap: theme.spacing.xxs }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}
        >
          <AppText variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
            {announcement.title}
          </AppText>
          {!announcement.read ? <UnreadIndicator /> : null}
        </View>
        <AppText color="muted" numberOfLines={1}>
          {announcement.info}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {announcement.createdAt.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {announcement.authorAlias ? ` · By ${announcement.authorAlias}` : ''}
        </AppText>
      </View>
    </Card>
  );
});

export default AnnouncementItem;
