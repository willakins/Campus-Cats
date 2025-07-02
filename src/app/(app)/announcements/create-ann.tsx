import { useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';

import { BackButton, Button, SnackbarMessage } from '@/components';
import { AnnouncementForm } from '@/forms/AnnouncementForm';
import { useAuth } from '@/providers/AuthProvider';
import DatabaseService from '@/services/DatabaseService';
import { setSelectedAnnouncement } from '@/stores/announcementStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { Announcement } from '@/types';

const CreateAnn = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const { user } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    info: '',
    authorAlias: '',
  });

  const createObj = () => {
    const newAnnouncement = new Announcement({
      id: '-1',
      title: formData.title,
      info: formData.info,
      createdAt: new Date(),
      createdBy: user,
      authorAlias: formData.authorAlias,
    });
    setSelectedAnnouncement(newAnnouncement);
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <BackButton />
      <SnackbarMessage
        text="Creating Announcement..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.lowerPageTitle}>Create Announcement</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <AnnouncementForm
          formData={formData}
          setFormData={setFormData}
          photos={photos}
          setPhotos={setPhotos}
        />
      </ScrollView>
      <Button
        onPress={() => {
          createObj();
          void database.handleAnnouncementCreate(photos, setVisible, router);
        }}
      >
        Create Announcement
      </Button>
    </SafeAreaView>
  );
};
export default CreateAnn;
