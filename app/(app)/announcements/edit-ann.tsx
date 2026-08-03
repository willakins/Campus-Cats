import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, LoadingIndicator, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { Announcement, parseUser } from '@/core/domain';
import { localMedia, storedMedia } from '@/core/media';
import { StoredMediaAsset } from '@/core/ports';
import {
  AnnouncementForm,
  AnnouncementFormData,
} from '@/forms/AnnouncementForm';
import { useAuth } from '@/providers/AuthProvider';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const EditAnnouncement = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement>();
  const [storedAssets, setStoredAssets] = useState<readonly StoredMediaAsset[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    info: '',
    authorAlias: '',
  });

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      appModules.announcements.get(id),
      appModules.announcements.media(id),
    ]).then(([announcementResult, mediaResult]) => {
      if (!announcementResult.ok) {
        Alert.alert(
          'Could not load announcement',
          announcementResult.error.message,
        );
        return;
      }
      setAnnouncement(announcementResult.value);
      setFormData({
        title: announcementResult.value.title,
        info: announcementResult.value.info,
        authorAlias: announcementResult.value.authorAlias,
      });
      if (mediaResult.ok) {
        setStoredAssets(mediaResult.value);
        setPhotos(mediaResult.value.map(({ url }) => url));
      }
    });
  }, [id]);

  const selectionFor = (uri: string) => {
    const stored = storedAssets.find((asset) => asset.url === uri);
    return stored ? storedMedia(stored.id) : localMedia(uri);
  };
  const save = async () => {
    if (!announcement) return;
    setVisible(true);
    const result = await appModules.announcements.update(
      parseUser(user),
      announcement.id,
      { ...formData, photos: photos.map(selectionFor) },
    );
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not save announcement', result.error.message);
      return;
    }
    router.replace({
      pathname: '/announcements/view-ann',
      params: { id: announcement.id },
    });
  };
  const confirmDelete = () => {
    if (!announcement) return;
    Alert.alert('Delete Announcement', 'Delete this announcement forever?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: () =>
          void appModules.announcements
            .remove(parseUser(user), announcement.id)
            .then((result) => {
              if (result.ok) router.replace('/announcements');
              else {
                Alert.alert(
                  'Could not delete announcement',
                  result.error.message,
                );
              }
            }),
      },
    ]);
  };

  if (!announcement) return <LoadingIndicator />;
  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Saving Announcement..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>Edit Announcement</Text>
      <ScrollView
        contentContainerStyle={[
          containerStyles.scrollView,
          { paddingBottom: '50%' },
        ]}
      >
        <AnnouncementForm
          formData={formData}
          setFormData={setFormData}
          photos={photos}
          setPhotos={setPhotos}
        />
      </ScrollView>
      <Button style={buttonStyles.bigButton} onPress={() => void save()}>
        <Text style={textStyles.bigButtonText}>Save Announcement</Text>
      </Button>
      <Button style={buttonStyles.bigDeleteButton} onPress={confirmDelete}>
        <Text style={textStyles.bigButtonText}>Delete Announcement</Text>
      </Button>
    </SafeAreaView>
  );
};

export default EditAnnouncement;
