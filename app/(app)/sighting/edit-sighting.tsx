import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, FlatList } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { getSelectedSighting, setSelectedSighting } from '@/stores/sightingStores';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';
import { buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button, SnackbarMessage, SightingForm } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { useAuth } from '@/providers';
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
  const imageHandler = new CatalogImageHandler({ type:'sightings', id:sighting.id, photos, profile, setPhotos, setProfile, setPicsChanged, setVisible});
  
  const [value, setValue] = useState(sighting.timeofDay);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' },
    { label: 'Night', value: 'night' },
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
    database.fetchSightingImages(sighting.id, setProfile, setPhotos);
  }, []);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Saving Report..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.title}>Edit Report</Text>
      
      <FlatList
        data={[1]}  // A dummy array to make FlatList scrollable
        keyExtractor={() => '1'}
        contentContainerStyle={[containerStyles.scrollView, {paddingBottom:'50%'}]}
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
          />)}/>
      <Button style={buttonStyles.button2} onPress={() => {
          createObj();
          database.saveSighting(photos, profile, isPicsChanged, setVisible, router);
        }}>
        <Text style={textStyles.bigButtonText}>Save Report</Text>
      </Button>
      <Button style={buttonStyles.button3} onPress={() => database.deleteSighting(sighting.id, setVisible, router)}>
        <Text style={textStyles.bigButtonText}>Delete Report</Text>
      </Button>
    </SafeAreaView>
  );
};
export default SightingEditScreen;