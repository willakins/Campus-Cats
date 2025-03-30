import React, { useEffect, useState } from 'react';
import { Text, Image, ScrollView, View } from 'react-native';

import MapView, { Marker } from 'react-native-maps';

import { CatSightingObject, StationEntryObject } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const StationEntry: React.FC<StationEntryObject> = ({ id, name, profilePic, longitude, latitude, lastStocked, stockingFreq,
  knownCats, isStocked }) => {
  const [profileURL, setProfile] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const database = DatabaseService.getInstance();

  const calculateDaysUntilRestock = () => {
    const lastStockedDate = new Date(lastStocked);
    if (isNaN(lastStockedDate.getTime())) return 0; // Handle invalid date

    const nextRestockDate = new Date(lastStockedDate);
    nextRestockDate.setDate(lastStockedDate.getDate() + stockingFreq);

    const today = new Date();
    const timeDiff = nextRestockDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
    if (isNaN(daysRemaining)) return -2;

    return daysRemaining;
  }
  var daysLeft = calculateDaysUntilRestock();  

  useEffect(() => {
    database.fetchStationImages(profilePic, setProfile);
  }, []);

  return (
    <ScrollView contentContainerStyle={containerStyles.scrollView}>
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
        {isStocked ?<Text style={textStyles.stationText2}> This station will need to be restocked in {daysLeft} days.</Text>: <Text style={textStyles.stationText1}> This station needs to be restocked!</Text>}
    </ScrollView>
  );
};