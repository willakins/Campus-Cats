import React, { useEffect, useState } from 'react';
import { Image, Text, KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { LatLng, Marker } from 'react-native-maps';

import { Button, TextInput } from '@/components';
import DatabaseService from '@/components/DatabaseService';
import { useAuth } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const CatSightingScreen = () => {
  const router = useRouter();
  const { docId, catDate, catFed, catHealth, catInfo, catPhoto, catLongitude, catLatitude, catName} = useLocalSearchParams();


  const docRef:string = docId as string;
  const [date, setDate] = useState<Date>(new Date(JSON.parse(catDate as string)));
  const [fed, setFed] = useState<boolean>(JSON.parse(catFed as string));
  const [health, setHealth] = useState<boolean>(JSON.parse(catHealth as string));
  const [photoUrl, setPhotoUrl] = useState<string>(catPhoto as string);
  const [info, setInfo] = useState<string>(catInfo as string);
  const [longitude, setLongitude] = useState<number>(parseFloat(catLongitude as string));
  const [latitude, setLatitude] = useState<number>(parseFloat(catLatitude as string));
  const [name, setName] = useState<string>(catName as string);
  const [photoImage, setPhoto] = useState<string>('');
  const { signOut, user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const database = DatabaseService.getInstance();

  var location:LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  useEffect(() => {
    database.fetchImage(photoUrl, setPhoto);
  }, []);

  const saveSighting = () => {
    database.saveSighting(docRef, name, info, photoUrl, fed, health, date, longitude, latitude);
    router.push('/(app)/(tabs)');
  }

  const deleteSighting = () => {
    database.deleteSighting(photoUrl, docRef)
    router.push('/(app)/(tabs)');
  };

  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };
  
  return (
    <KeyboardAvoidingView
      style={containerStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
        {isAdmin ? <Button style={buttonStyles.editButton} onPress={saveSighting}>
        <Text style= {textStyles.editText}>Save</Text>
      </Button> : null}
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <Text style={textStyles.catalogTitle}>
          {isAdmin ? 'Edit' : 'View'} A Cat Sighting
        </Text>
        <View style={containerStyles.container}>
          {photoImage ? (<Image source={{ uri: photoImage }} style={containerStyles.catImage} resizeMode='contain'/>) : 
            (<Text style={containerStyles.catImage}>Loading image...</Text>)}
          <View style={containerStyles.inputContainer}>
            {isAdmin ? <MapView
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
            </MapView> : null}
            <Text style={textStyles.sliderText}>Cat's Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              editable={isAdmin}
            />
            <Text style={textStyles.sliderText}>Additional Info</Text>
            <TextInput
              value={info}
              onChangeText={setInfo}
              editable={isAdmin}
            />
            <Text style={textStyles.sliderText}>Date Sighted</Text>
            <TextInput
              value={date.toString()}
              onChangeText={setInfo}
              editable={isAdmin}
            />
            <View style={containerStyles.sliderContainer}>
              <Switch value={health} onValueChange={setHealth} disabled={!isAdmin}/>
              <Text style={textStyles.sliderText}>Has been fed</Text>
            </View>
            <View style={containerStyles.sliderContainer}>
              <Switch value={fed} onValueChange={setFed} disabled={!isAdmin} />
              <Text style={textStyles.sliderText}>Is in good health</Text>
            </View>
          </View>
        </View>
        {isAdmin ? <Button onPress={deleteSighting}>
          Delete
        </Button> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
export default CatSightingScreen;