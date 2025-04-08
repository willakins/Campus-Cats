import React, { useState } from 'react';
import { SafeAreaView, Text, FlatList } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SightingForm, SnackbarMessage } from '@/components';
import { buttonStyles, textStyles, containerStyles } from '@/styles';
import { setSelectedSighting } from '@/stores/sightingStores';
import DatabaseService from '@/services/DatabaseService';
import { useAuth } from '@/providers';
import { Sighting } from '@/types';


const SightingCreateScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();

  const [visible, setVisible] = useState(false);
  
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' },
    { label: 'Night', value: 'night' },
  ]);

  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    info: "",
    fed: false,
    health: false,
    location: { latitude: 0, longitude: 0 },
    date: new Date(),
  });

  const createObj = () => {
    const newSighting = new Sighting({
      id: "-1",
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

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

      <SnackbarMessage text="Creating Report..." visible={visible} setVisible={setVisible} />

      <Text style={textStyles.title}>Create A Report</Text>
      <FlatList
        data={[1]}
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
            setPhotos={setPhotos}
            isCreate={true}
          />
        )}
      />

      <Button style={buttonStyles.button2} onPress={() => {
        createObj();
        database.createSighting(photos, setVisible, router);
      }}>
        <Text style={textStyles.bigButtonText}>Create Report</Text>
      </Button>
    </SafeAreaView>
  );
};
export default SightingCreateScreen;