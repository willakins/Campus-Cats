import { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { AnnouncementForm, AnnouncementFormData } from '@/forms/AnnouncementForm';
import { useAuth } from '@/providers/AuthProvider';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const CreateAnnouncement = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    info: '',
    authorAlias: '',
  });

  const createAnnouncement = async () => {
    setVisible(true);
    const result = await appModules.announcements.create(parseUser(user), {
      ...formData,
      photos,
    });
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not create announcement', result.error.message);
      return;
    }
    if (result.warnings.length > 0) {
      Alert.alert('Announcement created', result.warnings[0].message);
    }
    router.replace('/announcements');
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
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
        onPress={() => void createAnnouncement()}
      >
        <Text style={textStyles.bigButtonText}>Create Announcement</Text>
      </Button>
    </SafeAreaView>
  );
};

export default CreateAnnouncement;
