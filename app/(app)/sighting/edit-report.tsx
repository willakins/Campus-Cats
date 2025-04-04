import React, { useEffect, useState } from 'react';
import { Image, Text, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { LatLng, Marker } from 'react-native-maps';

import { Button, Switch, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { Ionicons } from '@expo/vector-icons';
import { buttonStyles, textStyles, containerStyles } from '@/styles';
import { SightingReportForm } from '@/forms';
import { Sighting } from '@/models';
import { CatSightingObject } from '@/types';

const CatSightingScreen = () => {
  const router = useRouter();
  const { docId, catDate, catFed, catHealth, catInfo, catPhoto, catLongitude, catLatitude, catName} = useLocalSearchParams();


  const docRef:string = docId as string;
  const spotted_time = new Date(JSON.parse(catDate as string));
  const fed = JSON.parse(catFed as string);
  const health = JSON.parse(catHealth as string);
  const photoUrl = catPhoto as string;
  const info = catInfo as string;
  const longitude = parseFloat(catLongitude as string);
  const latitude = parseFloat(catLatitude as string);
  const name = catName as string;
  const [photoImage, setPhoto] = useState<string>('');
  const database = DatabaseService.getInstance();
  const thisSighting: Sighting = {id: docRef, name, info, image: photoUrl, fed, health, spotted_time, latitude, longitude};

  useEffect(() => {
    database.fetchImage(photoUrl, setPhoto);
  }, []);

  const saveSighting = async (data: Sighting) => {
    const sightingObject = new CatSightingObject(
      docRef,
      data.name || '',
      data.info || '',
      data.image || '',
      data.fed,
      data.health,
      data.spotted_time || new Date(),
      data.latitude,
      data.longitude
    );
    database.saveSighting(sightingObject);
    router.push('/(app)/(tabs)');
  }

  const deleteSighting = async () => {
    database.deleteSighting(photoUrl, docRef)
    router.push('/(app)/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={containerStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={router.back}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SightingReportForm type="edit"
        onSubmit={saveSighting}
        onDelete={deleteSighting}
        imageURL={photoImage}
        defaultValues={thisSighting}
      />
    </KeyboardAvoidingView>
  );
};
export default CatSightingScreen;
