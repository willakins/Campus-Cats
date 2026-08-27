import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  AppText,
  Button,
  Card,
  DetailSkeleton,
  ErrorState,
  Screen,
  StatusPill,
} from '@/components/design';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { appModules } from '@/composition/appModules';
import {
  ClubEvent,
  canAccessRolePolicy,
  isExpiredEvent,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ViewEvent = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const actor = parseUser(useAuth().user);
  const theme = useAppTheme();
  const isOfficer = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageEvents,
  );
  const [event, setEvent] = useState<ClubEvent>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      if (!id) {
        setError('Missing event ID');
        setLoading(false);
        return () => { active = false; };
      }
      void appModules.events.get(actor, id).then((result) => {
        if (!active) return;
        if (result.ok) {
          setEvent(result.value);
          void appModules.events.markRead(actor, id);
        }
        else setError(result.error.message);
        setLoading(false);
      });
      return () => { active = false; };
    }, [actor.id, actor.role, id]),
  );

  const confirmDelete = () => {
    if (!event || deleting) return;
    Alert.alert('Delete Event', 'Delete this event and its picture forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () => {
          setDeleting(true);
          void appModules.events.remove(actor, event.id).then((result) => {
            setDeleting(false);
            if (result.ok) {
              router.replace({ pathname: '/announcements', params: { section: 'events' } });
            } else setError(result.error.message);
          });
        },
      },
    ]);
  };

  const expired = event ? isExpiredEvent(event, new Date()) : false;
  return (
    <Screen scroll>
      <AppHeader title="Event" eyebrow="Community" onBack={() => router.back()} />
      {loading ? (
        <DetailSkeleton label="Loading event" />
      ) : event ? (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <ProgressiveImage
            uri={event.imageUrl}
            accessibilityLabel={`Event picture for ${event.title}`}
            style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: theme.radii.card }}
          />
          <Card accent={expired ? theme.colors.textMuted : theme.colors.primary}>
            <View style={{ gap: theme.spacing.sm }}>
              <StatusPill
                tone={expired ? 'neutral' : 'primary'}
                label={expired ? 'Expired' : 'Upcoming'}
              />
              <AppText variant="pageTitle">{event.title}</AppText>
              <AppText variant="label" color="primary">
                {event.startsAt.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </AppText>
              <AppText>{event.location}</AppText>
              <AppText>{event.details}</AppText>
              <AppText color="muted" variant="caption">
                Visible through {event.expiresAt.toLocaleDateString()}
              </AppText>
            </View>
          </Card>
          {isOfficer ? (
            <Button
              label="Delete Event"
              icon="trash-outline"
              variant="danger"
              fullWidth
              loading={deleting}
              onPress={confirmDelete}
            />
          ) : null}
        </View>
      ) : (
        <ErrorState title="Event unavailable" message={error || 'Event not found'} />
      )}
    </Screen>
  );
};

export default ViewEvent;
