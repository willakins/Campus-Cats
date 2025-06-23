import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { StationForm } from '@/forms';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import { getSelectedStation, setSelectedStation } from '@/stores/stationStores';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { Station } from '@/types';

const edit_station = () => {
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);
  const station = getSelectedStation();

  const [profile, setProfile] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPicsChanged, setPicsChanged] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: station.name,
    location: station.location,
    lastStocked: station.lastStocked,
    stockingFreq: station.stockingFreq,
    knownCats: station.knownCats,
  });
  const imageHandler = new CatalogImageHandler({
    type: 'stations',
    id: station.id,
    photos,
    profile,
    setPhotos,
    setProfile,
    setPicsChanged,
    setVisible,
  });

  useEffect(() => {
    database.fetchStationImages(station.id, setProfile, setPhotos);
  }, []);

  const createObj = () => {
    const newStation = new Station({
      id: station.id,
      name: formData.name,
      location: formData.location,
      lastStocked: formData.lastStocked,
      stockingFreq: formData.stockingFreq,
      knownCats: formData.knownCats,
      isStocked: Station.calculateStocked(
        formData.lastStocked,
        formData.stockingFreq,
      ),
      createdBy: user,
    });
    setSelectedStation(newStation);
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={router.back}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Saving Station..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>Edit Station</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <StationForm
          formData={formData}
          setFormData={setFormData}
          photos={photos}
          profile={profile}
          setPhotos={setPhotos}
          setPicsChanged={setPicsChanged}
          imageHandler={imageHandler}
          isCreate={false}
        />
      </ScrollView>
      <Button
        style={buttonStyles.bigButton}
        onPress={() => {
          createObj();
          database.saveStation(
            profile,
            photos,
            isPicsChanged,
            setVisible,
            router,
          );
        }}
      >
        <Text style={textStyles.bigButtonText}> Save Station</Text>
      </Button>
      <Button
        style={buttonStyles.bigDeleteButton}
        onPress={() => database.deleteStation(setVisible, router)}
      >
        <Text style={textStyles.bigButtonText}>Delete Station</Text>
      </Button>
    </SafeAreaView>
  );
};
export default edit_station;
