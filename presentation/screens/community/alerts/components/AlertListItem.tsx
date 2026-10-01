import React from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { Alert } from '@/core/domain';
import { ListItemHeader } from '@/presentation/patterns/lists';
import { useAppTheme } from '@/theme';
import { AppText, Card, UnreadIndicator } from '@/presentation/ui';

export const AlertListItem = React.memo(function AlertListItem(
  alert: Alert & { readonly read?: boolean },
) {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <Card
      accessibilityLabel={`${alert.read ? 'Read' : 'Unread'} alert: ${alert.title}`}
      accent={theme.colors.gold}
      style={{ padding: theme.spacing.sm }}
      onPress={() =>
        router.push({
          pathname: '/community/alerts/[id]',
          params: { id: alert.id },
        })
      }
    >
      <View style={{ gap: theme.spacing.xxs }}>
        <ListItemHeader
          title={alert.title}
          trailing={!alert.read ? <UnreadIndicator /> : null}
        />
        <AppText color="muted" numberOfLines={1}>
          {alert.info}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {alert.createdAt.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          {alert.authorAlias ? ` · By ${alert.authorAlias}` : ''}
        </AppText>
      </View>
    </Card>
  );
});

export default AlertListItem;
