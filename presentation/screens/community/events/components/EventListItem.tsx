import React from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { ClubEvent, isExpiredEvent } from '@/core/domain';
import { useAppTheme } from '@/theme';
import { AppText, Card, CardContent, StatusPill } from '@/presentation/ui';
import { ProgressiveImage } from '@/presentation/ui/ProgressiveImage';

export const EventListItem = React.memo(function EventListItem({
  event,
  now,
}: {
  readonly event: ClubEvent;
  readonly now: Date;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const expired = isExpiredEvent(event, now);
  return (
    <Card
      accessibilityLabel={`View event: ${event.title}`}
      accent={expired ? theme.colors.textMuted : theme.colors.primary}
      padded={false}
      onPress={() =>
        router.push({ pathname: '/community/events/[id]' as never, params: { id: event.id } })
      }
    >
      <ProgressiveImage
        uri={event.imageUrl}
        accessibilityLabel={`Event picture for ${event.title}`}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
      />
      <CardContent>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          <StatusPill
            tone={expired ? 'neutral' : 'primary'}
            label={expired ? 'Expired' : 'Upcoming'}
            icon={expired ? 'archive-outline' : 'calendar-outline'}
          />
        </View>
        <AppText variant="cardTitle">{event.title}</AppText>
        <AppText color="primary" variant="label">
          {event.startsAt.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </AppText>
        <AppText color="muted">{event.location}</AppText>
      </CardContent>
    </Card>
  );
});
