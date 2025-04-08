import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { Button, CameraButton, DateTimeInput, TextInput } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import MapView, { LatLng, MapPressEvent, Marker } from 'react-native-maps';
import { StationEntryObject } from '@/types';


const create_station = () =>{
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date());

  const [formData, setFormData] = useState({name: "", profile: "", longitude: 0, latitude: 0, stockingFreq: "7", cats: ""});

  const handleChange = (field: string, value: string | number) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };
    
  const database = DatabaseService.getInstance();
  
  const createObj = () => {
    return new StationEntryObject('-1', formData.name, formData.profile, formData.longitude, formData.latitude, date.toISOString().split('T')[0], 
    formData.stockingFreq, formData.cats);
  }

  var location:LatLng = {
      latitude: formData.latitude,
      longitude: formData.longitude,
  };

  const handleMapPress = (event: MapPressEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      handleChange('latitude', latitude)
      handleChange('longitude', longitude)
    };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={() => database.createStation(createObj(), setVisible, router)}>
        <Text style={textStyles.editText}> Create Station</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Create A Station Entry</Text>
        <View style={containerStyles.inputContainer}>
          <Text style={textStyles.headline}>Station Name</Text>
          <TextInput 
            placeholder="What should this station be called?"
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('name', text)} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Station Location</Text>
          <MapView
              style={containerStyles.mapContainer}
              initialRegion={{
                latitude: 33.7756, // Default location (e.g., Georgia Tech)
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress} // This updates the location correctly
            >
              {location ? <Marker coordinate={location} /> : null}
            </MapView>
            <Text style={textStyles.subHeading2}>Last Time Stocked</Text>
            <DateTimeInput date={date || new Date()} setDate={setDate}/>
          <Text style={textStyles.subHeading2}>How Often Does This Station Need to be restocked? (in days)</Text>
          <TextInput
            placeholder={formData.stockingFreq}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('stockingFreq', text)}
            style={textStyles.input}/>
          <Text style={textStyles.subHeading2}>Cats Known to Frequent This Station (optional)</Text>
          <TextInput
            placeholder="Common cats"
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('cats', text)} 
            style={textStyles.descInput}
            multiline={true} />
          <Text style={textStyles.headline2}>Select Profile Picture</Text>
          <View style={containerStyles.cameraView}>
            <CameraButton onPhotoSelected={(text) => handleChange('profile', text)}></CameraButton>
            {formData.profile ? <Image source={{ uri: formData.profile }} style={containerStyles.selectedPreview} /> : null}
          </View>
        </View>
      </ScrollView>
      <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Entry...
        </Snackbar>
    </KeyboardAvoidingView>
  );
}
export default create_station;