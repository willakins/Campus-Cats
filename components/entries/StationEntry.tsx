import React, { useEffect, useState } from 'react';
import { Text, Image, View } from 'react-native';

import MapView, { Marker } from 'react-native-maps';

import { Station } from '@/types';
import DatabaseService from '../../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { useRouter } from 'expo-router';
import { getSelectedStation } from '@/stores/stationStores';

export const StationEntry: React.FC = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();

  const station = getSelectedStation();
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState<string>('');
  

  useEffect(() => {
    database.fetchStationImages(station.id, setProfile, setPhotos);
  }, []);

  return (
    <View style={containerStyles.card}>
        <Text style={textStyles.catalogTitle}>{station.name}</Text>
        <Text style={textStyles.detail}>Created by: {station.createdBy.id}</Text>
        {profile ? (<Image source={{ uri: profile }} style={containerStyles.headlineImage} resizeMode='contain'/>) : 
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
            key={station.id}
            coordinate={station.location}
          />
        </MapView>
        {station.knownCats.length > 0 ? <><Text style={textStyles.headline2}>
          Cats That Frequent This Station
        </Text><Text style={textStyles.normalText}>
          {station.knownCats}
        </Text></>: null}
        {station.isStocked ?<Text style={textStyles.stationText2}> This station will need to be restocked in {
          Station.calculateDaysLeft(station.lastStocked, station.stockingFreq)} days.</Text>: 
        <Text style={textStyles.stationText1}> This station needs to be restocked!</Text>}
        {photos.length > 0 && (
        <>
            <Text style={textStyles.sectionTitle}>Extra Photos</Text>
            {photos.map((url, index) => (
            <Image key={index} source={{ uri: url }} style={containerStyles.imageMain} />
            ))}
        </>
        )}
    </View>
    
  );
};
