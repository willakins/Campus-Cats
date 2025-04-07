import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { Ionicons } from '@expo/vector-icons';
import { buttonStyles, textStyles, containerStyles } from '@/styles';
import { SightingReportForm } from '@/forms';
import { Sighting } from '@/models';
import { CatSightingObject } from '@/types';
import { Snackbar } from 'react-native-paper';

const CatSightingScreen = () => {
  const router = useRouter();
  const { id, date, catFed, catHealth, info, photo, catLongitude, catLatitude, name, uid, timeofDay } = useLocalSearchParams() as { id: string, date: string,
    catFed: string, catHealth: string, info: string, photo: string, catLongitude: string, catLatitude: string, name: string, uid: string, timeofDay:string};

  const spotted_time = new Date(JSON.parse(date));
  const fed = JSON.parse(catFed);
  const health = JSON.parse(catHealth);
  const longitude = parseFloat(catLongitude);
  const latitude = parseFloat(catLatitude);

  const [photoImage, setPhoto] = useState<string>('');
  const database = DatabaseService.getInstance();
  const thisSighting: Sighting = {id: id, name, info, image: photo, fed, health, spotted_time, latitude, longitude, uid, timeofDay};
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    database.fetchImage(photo, setPhoto);
  }, []);

  const createObj = (data: Sighting) => {
    return new CatSightingObject(id, data.name || name, data.info || info, data.image || photo, data.fed, data.health, data.spotted_time || new Date(),
      data.latitude, data.longitude, uid, data.timeofDay);
  }

  return (
    <KeyboardAvoidingView
      style={containerStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={router.back}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SightingReportForm type="edit"
        onSubmit={(data) => database.saveSighting(createObj(data), setVisible, router)}
        onDelete={() => database.deleteSighting(photo, id, router)}
        imageURL={photoImage}
        defaultValues={thisSighting}
      />
      <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
        Saving...
      </Snackbar>
    </KeyboardAvoidingView>
  );
};
export default CatSightingScreen;
