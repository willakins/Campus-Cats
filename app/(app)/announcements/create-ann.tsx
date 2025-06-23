import { useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { AnnouncementForm } from '@/forms/AnnouncementForm';
import { useAuth } from '@/providers/AuthProvider';
import DatabaseService from '@/services/DatabaseService';
import { setSelectedAnnouncement } from '@/stores/announcementStores';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { Announcement } from '@/types';

const create_ann = () => {
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
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.navigate('/announcements')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
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
        style={buttonStyles.bigButton}
        onPress={async () => {
          createObj();
          database.handleAnnouncementCreate(photos, setVisible, router);
        }}
      >
        <Text style={textStyles.bigButtonText}> Create Announcement</Text>
      </Button>
    </SafeAreaView>
  );
};
export default create_ann;
