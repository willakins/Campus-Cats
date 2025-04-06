import React, { useEffect, useState } from 'react';
import { Text, Image, ScrollView, View } from 'react-native';

import MapView, { Marker } from 'react-native-maps';

import { StationEntryObject } from '@/types';
import { Button } from '@/components/ui/Buttons';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

export const StationEntry: React.FC<StationEntryObject> = ({ id, name, profile, longitude, latitude, lastStocked, stockingFreq,
  knownCats, isStocked }) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false)

  const [profileURL, setProfile] = useState<string>(profile);
  const thisStation = new StationEntryObject(id, name, profile, longitude, latitude, lastStocked, stockingFreq, knownCats);

  useEffect(() => {
    database.fetchStationImages(id, name, setProfile);
  }, []);

  return (
    <ScrollView contentContainerStyle={containerStyles.scrollView2}>
      <Text style={textStyles.catalogTitle}>{name}</Text>
      {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.headlineImage} resizeMode='contain'/>) : 
        <Text style={textStyles.catalogTitle}>Loading image...</Text>}
      <MapView
        style={containerStyles.mapContainer}
        initialRegion={{
          latitude: 33.7756, // Default location (e.g., Georgia Tech)
          longitude: -84.3963,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          key={id}
          coordinate={{
            latitude: latitude,
            longitude: longitude,
          }}
        />
      </MapView>
      {knownCats.length > 0 ? <><Text style={textStyles.headline2}>
        Cats That Frequent This Station
      </Text><Text style={textStyles.normalText}>
          {knownCats}
        </Text></>: null}
        {isStocked ?<Text style={textStyles.stationText2}> This station will need to be restocked in {StationEntryObject.calculateDaysLeft(lastStocked, stockingFreq)} days.</Text>: 
        <Text style={textStyles.stationText1}> This station needs to be restocked!</Text>}
        <Button style={buttonStyles.refillButton} onPress={() => database.stockStation(thisStation, router, setVisible)}>I Just Refilled This Station!</Button>
        <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
                Saving...
          </Snackbar>
    </ScrollView>
  );
};
