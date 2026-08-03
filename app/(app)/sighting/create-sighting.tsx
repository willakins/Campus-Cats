import React, { useState } from 'react';
import { Alert, FlatList, SafeAreaView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { SightingForm } from '@/forms';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const SightingCreateScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
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

  const createSighting = async () => {
    setVisible(true);
    const result = await appModules.sightings.create(parseUser(user), {
      ...formData,
      timeOfDay: value,
      photos,
    });
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not create report', result.error.message);
      return;
    }
    router.replace({
      pathname: '/sighting/view-sighting',
      params: { id: result.value.id },
    });
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.push('/(app)/(tabs)')}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Creating Report..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.pageTitle}>Create A Report</Text>
      <FlatList
        data={[1]}
        keyExtractor={() => 'sighting-form'}
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
            isCreate
          />
        )}
      />
      <Button style={buttonStyles.bigButton} onPress={() => void createSighting()}>
        <Text style={textStyles.bigButtonText}>Create Report</Text>
      </Button>
    </SafeAreaView>
  );
};

export default SightingCreateScreen;
