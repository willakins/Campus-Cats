import React, { useCallback, useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, CameraButton, CatalogImageHandler } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { StationEntryObject } from '@/types/StationEntryObject';
import MapView, { LatLng, Marker } from 'react-native-maps';

const edit_station = () => {
  const router = useRouter();
  const { paramId, paramName, paramPic, paramLong, paramLat, paramStocked, paramCats, paramLastStocked, paramStockingFreq} = useLocalSearchParams();
  const id = paramId as string;
  const [name, setName] = useState<string>(paramName as string);
  const originalName = name;
  const [profilePic, setProfile] = useState<string>(paramPic as string);
  const [longitude, setLongitude] = useState<number>(parseFloat(paramLong as string));
  const [latitude, setLatitude] = useState<number>(parseFloat(paramLat as string));
  const lastStocked = paramLastStocked as string;
  const [stockingFreq, setStockingFreq] = useState<string>(paramStockingFreq as string);
  const [knownCats, setKnownCats] = useState<string>(paramCats as string);
  const isStocked = paramStocked === "true";
  const [visible, setVisible] = useState<boolean>(false);
  const database = DatabaseService.getInstance();
  const thisStation = new StationEntryObject(id, name, longitude, latitude, lastStocked, stockingFreq, knownCats);
  const [profileChanged, setChanged] = useState<boolean>(false);
  var location:LatLng = {
      latitude: latitude,
      longitude: longitude,
  };
  

  useEffect(() => {
    database.fetchStationImages(id, name, setProfile);
  }, []);

  const changeName = (text:string) => {
    setName(text);
    setChanged(true);
  }

  const changeFreq = (text:string) => {
    setStockingFreq(text);
    setChanged(true);
  }

  const changeCats = (text:string) => {
    setKnownCats(text)
    setChanged(true);
  };

  const changePic = () => {
    database.deleteStation(id, profilePic, setVisible, router);
    setChanged(true);
  }

  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={router.back}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} 
      onPress={() => database.saveStation(thisStation, profilePic, profileChanged, originalName, setVisible, router)}>
        <Text style ={textStyles.editText}> Save Station</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Edit A Station Entry</Text>
        {profilePic ? (<Image source={{ uri: profilePic }} style={containerStyles.headlineImage} resizeMode="contain" />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
          <View style={containerStyles.extraPicsContainer}>
          <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
                Saving...
          </Snackbar>
        </View>
        <MapView
              style={containerStyles.mapContainer}
              initialRegion={{
                latitude: 33.7756,
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress} // This updates the location correctly
            >
              {location ? <Marker coordinate={location} /> : null}
            </MapView>
        <View style={containerStyles.loginContainer}>
          <Text style={textStyles.headline}>Station Name</Text>
          <TextInput 
            value={name}
            placeholderTextColor = "#888"
            onChangeText={changeName} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Days Between Restocking</Text>
          <TextInput
            value={stockingFreq}
            placeholderTextColor = "#888"
            onChangeText={changeFreq} 
            style={textStyles.input}/>
          <Text style={textStyles.headline}>Cats Known to Frequent This Station (optional)</Text>
          <TextInput
            value={knownCats}
            placeholderTextColor = "#888"
            onChangeText={changeCats} 
            style={textStyles.descInput} 
            multiline={true}/>
        </View>
        <Text style={textStyles.headline}> Change Profile Photo </Text>
        <View style={containerStyles.cameraView}>
          <CameraButton onPhotoSelected={setProfile}></CameraButton>
        </View>
        <Button style={buttonStyles.deleteButton}onPress={changePic}> Delete Station Entry</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default edit_station;