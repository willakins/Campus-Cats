import React from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { ClubEvent, isExpiredEvent } from '../../core/domain';
import { useAppTheme } from '../../theme';
import { AppText, Card, StatusPill } from '../design';
import { ProgressiveImage } from '../ui/ProgressiveImage';

export const EventItem = React.memo(function EventItem({
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
      onPress={() =>
        router.push({ pathname: '/events/view-event' as never, params: { id: event.id } })
      }
      style={{ padding: 0 }}
    >
      <ProgressiveImage
        uri={event.imageUrl}
        accessibilityLabel={`Event picture for ${event.title}`}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
      />
      <View style={{ gap: theme.spacing.xs, padding: theme.spacing.md }}>
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
      </View>
    </Card>
  );
});
