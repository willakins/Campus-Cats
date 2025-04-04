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
  const { docId, catDate, catFed, catHealth, catInfo, catPhoto, catLongitude, catLatitude, catName} = useLocalSearchParams();

  const date = new Date(JSON.parse(catDate as string));
  const fed = JSON.parse(catFed as string);
  const health = JSON.parse(catHealth as string);
  const photoUrl = catPhoto as string;
  const info = catInfo as string;
  const longitude = parseFloat(catLongitude as string);
  const latitude = parseFloat(catLatitude as string);
  const name = catName as string;
  const [photoImage, setPhoto] = useState<string>('');
  const { user } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;
  const database = DatabaseService.getInstance();

  var location:LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  useEffect(() => {
    database.fetchImage(photoUrl, setPhoto);
  }, []);

  const editSighting = () => {
    router.push({ pathname: './edit-report', params: {
      docId: docId,
      catDate: catDate,
      catFed: catFed,
      catHealth: catHealth,
      catPhoto: catPhoto,
      catInfo: catInfo,
      catLongitude: catLongitude,
      catLatitude: catLatitude,
      catName: catName
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
      {isAdmin ? <Button style={buttonStyles.editButton} onPress={editSighting}>
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
              value={date.toString()}
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
