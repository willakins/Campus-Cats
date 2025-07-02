import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { SightingForm } from '@/forms';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import {
  getSelectedSighting,
  setSelectedSighting,
} from '@/stores/sightingStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { Sighting } from '@/types';

const SightingEditScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();
  const sighting = getSelectedSighting();

  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState<string>('');
  const [isPicsChanged, setPicsChanged] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const imageHandler = new CatalogImageHandler({
    type: 'sightings',
    id: sighting.id,
    photos,
    profile,
    setPhotos,
    setProfile,
    setPicsChanged,
    setVisible,
  });

  const [value, setValue] = useState(sighting.timeofDay);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Morning', value: 'Morning' },
    { label: 'Afternoon', value: 'Afternoon' },
    { label: 'Night', value: 'Night' },
  ]);

  const [formData, setFormData] = useState({
    name: sighting.name,
    info: sighting.info,
    fed: sighting.fed,
    health: sighting.health,
    location: sighting.location,
    createdBy: sighting.createdBy,
    date: sighting.date,
  });

  const createObj = () => {
    const newSighting = new Sighting({
      id: sighting.id,
      name: formData.name,
      info: formData.info,
      fed: formData.fed,
      health: formData.health,
      date: formData.date,
      location: formData.location,
      createdBy: user,
      timeofDay: value,
    });

    setSelectedSighting(newSighting);
  };

  useEffect(() => {
    void database.fetchSightingImages(sighting.id, setProfile, setPhotos);
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
        text="Saving Report..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>Edit Report</Text>

      <FlatList
        data={[1]} // A dummy array to make FlatList scrollable
        keyExtractor={() => '1'}
        contentContainerStyle={containerStyles.scrollView}
        renderItem={() => (
          <SightingForm
            formData={formData}
            setFormData={setFormData}
            value={value}
            setValue={setValue}
            open={open}
            setOpen={setOpen}
            items={items}
            setItems={setItems}
            photos={photos}
            profile={profile}
            setPhotos={setPhotos}
            setPicsChanged={setPicsChanged}
            imageHandler={imageHandler}
            isCreate={false}
          />
        )}
      />
      <Button
        onPress={() => {
          createObj();
          void database.saveSighting(
            photos,
            profile,
            isPicsChanged,
            setVisible,
            router,
          );
        }}
      >
        Save Report
      </Button>
      <Button
        style={buttonStyles.bigDeleteButton}
        onPress={() => database.deleteSighting(sighting.id, setVisible, router)}
      >
        Delete Report
      </Button>
    </SafeAreaView>
  );
};
export default SightingEditScreen;
