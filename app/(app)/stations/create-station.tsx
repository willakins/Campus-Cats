import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { StationForm } from '@/forms';

const create_station = () =>{
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [formData, setFormData] = useState({name: "", location:{latitude:0, longitude: 0}, lastStocked:new Date(), stockingFreq: 7, knownCats: ""});
    
  const createStation = async () => {
    setVisible(true);
    const result = await appModules.stations.create(parseUser(user), {
      ...formData,
      photos,
    });
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not create station', result.error.message);
      return;
    }
    router.replace({
      pathname: '/stations/view-station',
      params: { id: result.value.id },
    });
  };

  return (
    <SafeAreaView  style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Creating Station..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.pageTitle}>Create A Station</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <StationForm
          formData={formData}
          setFormData={setFormData}
          photos={photos}
          setPhotos={setPhotos}
          isCreate={true}/>
      </ScrollView>
      <Button style={buttonStyles.bigButton} onPress={() => void createStation()}>
        <Text style={textStyles.bigButtonText}> Create Station</Text>
      </Button>
    </SafeAreaView>
  );
}
export default create_station;
