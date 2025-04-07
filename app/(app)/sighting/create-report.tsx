import { KeyboardAvoidingView, Platform  } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';

import { Button } from '@/components';
import { db } from '@/config/firebase';
import { SightingReportForm } from '@/forms';
import { Sighting, sightingPath } from '@/models';
import { buttonStyles, containerStyles } from '@/styles';
import DatabaseService from '@/components/services/DatabaseService';
import { useState } from 'react';
import { CatSightingObject } from '@/types';
import { Snackbar } from 'react-native-paper';

const CatReportScreen = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);

  const createObj = (data: Sighting) => {
    return new CatSightingObject(data.id, data.name, data.info, data.image, data.fed, data.health, data.spotted_time, data.latitude, data.longitude, data.uid);
  }

  return (
    <KeyboardAvoidingView
      style={containerStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SightingReportForm type="create" onSubmit={(data) => database.handleReportSubmission(createObj(data), setVisible, router)} />
      <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
        Saving...
      </Snackbar>
    </KeyboardAvoidingView>
  );
};
export default CatReportScreen;
