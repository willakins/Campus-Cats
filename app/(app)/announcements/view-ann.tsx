import { useCallback, useState } from 'react';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  Button,
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
  Screen,
} from '@/components/design';
import { AnnouncementEntry } from '@/components/entries/AnnouncementEntry';
import { appModules } from '@/composition/appModules';
import {
  Announcement,
  canAccessRolePolicy,
  roleAccessPolicies,
} from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';

const ViewAnnouncement = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const isAdmin = canAccessRolePolicy(
    user.role,
    roleAccessPolicies.manageAnnouncements,
  );
  const [announcement, setAnnouncement] = useState<Announcement>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [error, setError] = useState<string>();
  const [mediaError, setMediaError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      setMediaError(undefined);
      if (!id) {
        setError('Missing announcement ID');
        setLoading(false);
        return () => {
          active = false;
        };
      }
      void Promise.all([
        appModules.announcements.get(id),
        appModules.announcements.media(id),
      ]).then(([announcementResult, mediaResult]) => {
        if (!active) return;
        if (announcementResult.ok) {
          setAnnouncement(announcementResult.value);
          void appModules.announcements.markRead(user, id);
        } else setError(announcementResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setMediaError(mediaResult.error.message);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [id, user.id]),
  );

  return (
    <Screen
      scroll
      footer={
        announcement && isAdmin ? (
          <Button
            label="Edit announcement"
            icon="create-outline"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/announcements/edit-ann',
                params: { id: announcement.id },
              })
            }
          />
        ) : undefined
      }
    >
      <AppHeader
        title="Announcement"
        eyebrow="Campus Cats update"
        onBack={() => router.back()}
      />
      {mediaError ? (
        <FeedbackBanner message={mediaError} tone="warning" />
      ) : null}
      {loading ? (
        <DetailSkeleton label="Loading announcement" />
      ) : announcement ? (
        <AnnouncementEntry announcement={announcement} media={media} />
      ) : (
        <ErrorState
          title="Announcement unavailable"
          message={error || 'Announcement not found'}
        />
      )}
    </Screen>
  );
};

export default ViewAnnouncement;
