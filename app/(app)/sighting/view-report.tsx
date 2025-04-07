import React, { useEffect, useState } from 'react';
import { Image, Text, KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { LatLng, Marker } from 'react-native-maps';

import { Button, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { useAuth } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { buttonStyles, textStyles, containerStyles } from '@/styles';

const CatSightingScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();
  const { id, date, catFed, catHealth, info, photo, catLongitude, catLatitude, name, uid } = useLocalSearchParams() as { id: string, date: string,
      catFed: string, catHealth: string, info: string, photo: string, catLongitude: string, catLatitude: string, name: string, uid: string};
  
  const spotted_time = new Date(JSON.parse(date));
  const fed = JSON.parse(catFed);
  const health = JSON.parse(catHealth);
  const longitude = parseFloat(catLongitude);
  const latitude = parseFloat(catLatitude);
  const [photoImage, setPhoto] = useState<string>('');
  
  const isAuthorized = user.role === 1 || user.role === 2 || user.id === uid;

  const getDateString = (date:Date) => {
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
      ];
    return`${monthNames[date.getMonth()]}, ${date.getDate()}, ${date.getFullYear()}`;
}
  
  const dateString = timeofDay + ' of ' + getDateString(spotted_time);

  var location:LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  useEffect(() => {
    database.fetchImage(photo, setPhoto);
  }, []);

  const editSighting = () => {
    router.push({ pathname: './edit-report', params: {
      id:id, 
      date:date, 
      catFed:catFed, 
      catHealth:catHealth, 
      info:info, 
      photo:photo, 
      catLongitude:catLongitude, 
      catLatitude:catLatitude, 
      name:name, 
      uid:uid
    }})
  };

  return (
    <KeyboardAvoidingView
      style={containerStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Button style={buttonStyles.logoutButton} onPress={router.back}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {isAuthorized ? <Button style={buttonStyles.editButton} onPress={editSighting}>
        <Text style= {textStyles.editText}>Edit</Text>
      </Button> : null}
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <Text style={textStyles.catalogTitle}>
          View A Cat Sighting
        </Text>
        <View style={containerStyles.container}>
          {photoImage ? (<Image source={{ uri: photoImage }} style={containerStyles.catImage} resizeMode='contain'/>) : 
            (<Text style={containerStyles.catImage}>Loading image...</Text>)}
          <View style={containerStyles.inputContainer}>
            <MapView
              style={containerStyles.mapContainer}
              initialRegion={{
                latitude: 33.7756,
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              {location ? <Marker coordinate={location} /> : null}
            </MapView>
            <Text style={textStyles.sliderText}>Cat's Name</Text>
            <TextInput
              value={name}
              editable={false}
            />
            <Text style={textStyles.sliderText}>Additional Info</Text>
            <TextInput
              value={info}
              editable={false}
            />
            <Text style={textStyles.sliderText}>Date Sighted</Text>
            <TextInput
              value={dateString}
              editable={false}
            />
            <View style={containerStyles.sliderContainer}>
              <Switch value={fed} disabled={true}/>
              <Text style={textStyles.sliderText}>Has been fed</Text>
            </View>
            <View style={containerStyles.sliderContainer}>
              <Switch value={health} disabled={true} />
              <Text style={textStyles.sliderText}>Is in good health</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CatSightingScreen;
