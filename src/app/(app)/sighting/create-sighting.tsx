import React, { useState } from 'react';
import { FlatList, SafeAreaView, Text } from 'react-native';

import { useRouter } from 'expo-router';

import { BackButton, Button, SnackbarMessage } from '@/components';
import { SightingForm } from '@/forms';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import { setSelectedSighting } from '@/stores/sightingStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { Sighting } from '@/types';

const SightingCreateScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();

  const [visible, setVisible] = useState(false);

  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Morning', value: 'Morning' },
    { label: 'Afternoon', value: 'Afternoon' },
    { label: 'Night', value: 'Night' },
  ]);

  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    info: '',
    fed: false,
    health: false,
    location: { latitude: 0, longitude: 0 },
    date: new Date(),
  });

  const createObj = () => {
    const newSighting = new Sighting({
      id: '-1',
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
      <BackButton />

      <SnackbarMessage
        text="Creating Report..."
        visible={visible}
        setVisible={setVisible}
      />

      <Text style={textStyles.pageTitle}>Create A Report</Text>
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

      <Button
        onPress={() => {
          createObj();
          void database.createSighting(photos, setVisible, router);
        }}
      >
        Create Report
      </Button>
    </SafeAreaView>
  );
};
export default SightingCreateScreen;
