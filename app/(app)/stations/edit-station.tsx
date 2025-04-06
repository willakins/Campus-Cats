import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, CameraButton } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { StationEntryObject } from '@/types/StationEntryObject';
import MapView, { LatLng, Marker } from 'react-native-maps';

const edit_station = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const { id, name, profile, catLongitude, catLatitude, knownCats, lastStocked, stockingFreq} = useLocalSearchParams() as { id:string, name:string, 
    profile:string, catLongitude:string, catLatitude:string, knownCats:string, lastStocked:string, stockingFreq:string};
  const [profileUrl, setProfile] = useState<string>(profile);
  const [profileChanged, setChanged] = useState<boolean>(false);
  const [formData, setFormData] = useState({name: name, longitude: +(catLongitude), latitude: +(catLatitude), stockingFreq: stockingFreq, knownCats: knownCats});
  
  const handleChange = (field: string, value: string | number) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  var location:LatLng = {latitude: formData.latitude, longitude: formData.longitude};
  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    handleChange('latitude', latitude);
    handleChange('longitude', longitude);
  };
  
  useEffect(() => {
    database.fetchStationImages(id, name, setProfile);
    setLoading(false);
  }, []);

  const createObj = () => {
    return new StationEntryObject(id, formData.name, profileUrl, formData.longitude, formData.latitude, lastStocked, formData.stockingFreq, formData.knownCats);
  }

  const changeProfile = (photo:string) => {
    setProfile(photo);
    setChanged(true);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={router.back}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {!loading && <Button style={buttonStyles.editButton} 
      onPress={() => database.saveStation(createObj(), profileChanged, setVisible, router)}>
        <Text style ={textStyles.editText}> Save Station</Text>
      </Button>}
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Edit A Station Entry</Text>
        {profileUrl ? (<Image source={{ uri: profileUrl }} style={containerStyles.headlineImage} resizeMode="contain" />) : 
        <Text style={textStyles.title}>Loading image...</Text>}
        <MapView
              style={containerStyles.mapContainer}
              initialRegion={{
                latitude: 33.7756,
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress}
            >
              {location ? <Marker coordinate={location} /> : null}
            </MapView>
        <View style={containerStyles.loginContainer}>
          <Text style={textStyles.headline}>Station Name</Text>
          <TextInput 
            value={formData.name}
            placeholderTextColor = "#888"
            onChangeText={(text) => handleChange('name', text)} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Days Between Restocking</Text>
          <TextInput
            value={formData.stockingFreq}
            placeholderTextColor = "#888"
            onChangeText={(text) => handleChange('stockingFreq', text)} 
            style={textStyles.input}/>
          <Text style={textStyles.headline}>Cats Known to Frequent This Station (optional)</Text>
          <TextInput
            value={formData.knownCats}
            placeholderTextColor = "#888"
            onChangeText={(text) => handleChange('knownCats', text)} 
            style={textStyles.descInput} 
            multiline={true}/>
        </View>
        <Text style={textStyles.headline}> Change Profile Photo </Text>
        <View style={containerStyles.cameraView}>
          <CameraButton onPhotoSelected={changeProfile}></CameraButton>
        </View>
        <Button style={buttonStyles.deleteButton}onPress={() => database.deleteStation(id, profileUrl, setVisible, router)}> Delete Station Entry</Button>
      </ScrollView>
      <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
        Saving...
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
export default edit_station;