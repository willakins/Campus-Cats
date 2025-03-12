import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { Button, CameraButton, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import MapView, { LatLng, MapPressEvent, Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StationEntryObject } from '@/types';


const create_station = () =>{
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [name, setName] = useState<string>('');
  const [profile, setProfile] = useState<string>('');
  const [longitude, setLongitude] = useState<number>(-84.3963);
  const [latitude, setLatitude] = useState<number>(33.7756);
  const [lastStocked, setLastStocked] = useState<string>('');
  const [stockingFreq, setStockingFreq] = useState<string>("7");
  const [cats, setCats] = useState<string>('');
  const thisStation:StationEntryObject = 
    new StationEntryObject('-1', name, profile, longitude, latitude, lastStocked, stockingFreq, cats);

  const database = DatabaseService.getInstance();
  

  var location:LatLng = {
      latitude: latitude,
      longitude: longitude,
  };

  const handleMapPress = (event: MapPressEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setLatitude(latitude);
      setLongitude(longitude);
    };
  
    const handleDateChange = (event: any, selectedDate: Date | undefined) => {
      if (selectedDate) {
        setSelectedDate(selectedDate);
        setLastStocked(selectedDate.toISOString().split('T')[0]);
      }
    };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={() => database.createStation(thisStation, router)}>
        <Text style={textStyles.editText}> Create Station</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Create A Station Entry</Text>
        <View style={containerStyles.inputContainer}>
          <Text style={textStyles.headline}>Station Name</Text>
          <TextInput 
            placeholder="What should this station be called?"
            placeholderTextColor="#888"
            onChangeText={setName} 
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
            <View style={containerStyles.dateInput}>
              <Text style={textStyles.dateText}>{lastStocked ? lastStocked : "Unknown Date"}</Text>
              <DateTimePicker
                  testID="dateTimePicker"
                  value={selectedDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  style={containerStyles.picker}
                />
            </View>
          <Text style={textStyles.subHeading2}>How Often Does This Station Need to be restocked? (in days)</Text>
          <TextInput
            placeholder={stockingFreq}
            placeholderTextColor="#888"
            onChangeText={setStockingFreq} 
            style={textStyles.input}/>
          <Text style={textStyles.subHeading2}>Cats Known to Frequent This Station (optional)</Text>
          <TextInput
            placeholder="Common cats"
            placeholderTextColor="#888"
            onChangeText={setCats} 
            style={textStyles.descInput}
            multiline={true} />
          <Text style={textStyles.headline2}>Select Profile Picture</Text>
          <View style={containerStyles.cameraView}>
            <CameraButton onPhotoSelected={setProfile}></CameraButton>
            {profile ? <Image source={{ uri: profile }} style={containerStyles.selectedPreview} /> : null}
          </View>
        </View>
        <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Entry...
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default create_station;