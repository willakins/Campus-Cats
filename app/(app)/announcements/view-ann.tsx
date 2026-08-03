import { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AnnouncementEntry, Button, LoadingIndicator } from '@/components';
import { appModules } from '@/composition/appModules';
import { Announcement } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ViewAnnouncement = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const [announcement, setAnnouncement] = useState<Announcement>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError('Missing announcement ID');
        return;
      }
      void Promise.all([
        appModules.announcements.get(id),
        appModules.announcements.media(id),
      ]).then(([announcementResult, mediaResult]) => {
        if (announcementResult.ok) setAnnouncement(announcementResult.value);
        else setError(announcementResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
      });
    }, [id]),
  );

  if (!announcement && !error) return <LoadingIndicator />;
  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {announcement ? (
        <>
          <ScrollView
            contentContainerStyle={[
              containerStyles.scrollView,
              { paddingTop: '10%' },
            ]}
          >
            <AnnouncementEntry announcement={announcement} media={media} />
          </ScrollView>
          {isAdmin ? (
            <Button
              style={buttonStyles.bigButton}
              onPress={() =>
                router.push({
                  pathname: '/announcements/edit-ann',
                  params: { id: announcement.id },
                })
              }
            >
              <Text style={textStyles.bigButtonText}>Edit Announcement</Text>
            </Button>
          ) : null}
        </>
      ) : (
        <Text style={textStyles.pageTitle}>{error}</Text>
      )}
    </SafeAreaView>
  );
};

export default ViewAnnouncement;
