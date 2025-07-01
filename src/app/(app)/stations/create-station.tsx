import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { StationForm } from '@/forms';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import { setSelectedStation } from '@/stores/stationStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { Station } from '@/types';

const CreateStation = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const { user } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    location: { latitude: 0, longitude: 0 },
    lastStocked: new Date(),
    stockingFreq: 7,
    knownCats: '',
  });

  const createObj = () => {
    const newStation = new Station({
      id: '-1',
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
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Creating Station..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>Create A Station</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <StationForm
          formData={formData}
          setFormData={setFormData}
          photos={photos}
          setPhotos={setPhotos}
          isCreate={true}
        />
      </ScrollView>
      <Button
        style={buttonStyles.bigButton}
        onPress={() => {
          createObj();
          void database.createStation(photos, setVisible, router);
        }}
      >
        <Text style={textStyles.bigButtonText}> Create Station</Text>
      </Button>
    </SafeAreaView>
  );
};
export default CreateStation;
