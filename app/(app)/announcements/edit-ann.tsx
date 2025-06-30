import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { AnnouncementForm } from '@/forms';
import { useAuth } from '@/providers/AuthProvider';
import DatabaseService from '@/services/DatabaseService';
import {
  getSelectedAnnouncement,
  setSelectedAnnouncement,
} from '@/stores/announcementStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { Announcement } from '@/types';

const EditAnn = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const { user } = useAuth();
  const ann = getSelectedAnnouncement();
  const [visible, setVisible] = useState<boolean>(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [isPicsChanged, setPicsChanged] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: ann.title,
    info: ann.info,
    authorAlias: ann.authorAlias,
  });

  const createObj = () => {
    setSelectedAnnouncement(
      new Announcement({
        id: ann.id,
        title: formData.title,
        info: formData.info,
        createdAt: new Date(),
        createdBy: user,
        authorAlias: formData.authorAlias,
      }),
    );
  };

  useEffect(() => {
    void database.fetchAnnouncementImages(ann.id, setPhotos);
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.back()}
      >
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
          setPicsChanged={setPicsChanged}
        />
      </ScrollView>
      <Button
        style={buttonStyles.bigButton}
        onPress={() => {
          createObj();
          void database.handleAnnouncementSave(
            photos,
            isPicsChanged,
            setVisible,
            router,
          );
        }}
      >
        <Text style={textStyles.bigButtonText}> Save Announcement</Text>
      </Button>
      <Button
        style={buttonStyles.bigDeleteButton}
        onPress={() => database.deleteAnnouncement(ann.id, router, setVisible)}
      >
        <Text style={textStyles.bigButtonText}>Delete Announcement</Text>
      </Button>
    </SafeAreaView>
  );
};
export default EditAnn;
