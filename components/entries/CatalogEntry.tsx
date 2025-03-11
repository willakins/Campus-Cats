import React, { useEffect, useState } from 'react';
import { Text, Image, ScrollView, View } from 'react-native';

import MapView, { Marker } from 'react-native-maps';

import { CatalogEntryObject } from '@/types/CatalogEntryObject';
import { CatSightingObject } from '@/types';
import DatabaseService from '../DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const CatalogEntry: React.FC<CatalogEntryObject> = ({ id, name, info }) => {
  const [profileURL, setProfile] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [sightings, setSightings] = useState<CatSightingObject[]>([]);
  const database = DatabaseService.getInstance();  

  useEffect(() => {
    database.fetchCatImages(name, setProfile, setImageUrls);
    database.getSightings(name, setSightings);
  }, []);

  return (
    <ScrollView contentContainerStyle={containerStyles.scrollView}>
      <Text style={textStyles.catalogTitle}>{name}</Text>
      {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.headlineImage}/>) : 
        <Text style={textStyles.catalogTitle}>Loading image...</Text>}
      <Text style={textStyles.catalogDescription}>{info}</Text>
      <Text style={textStyles.headline}> Sightings </Text>
      <MapView
        style={containerStyles.mapContainer}
        initialRegion={{
          latitude: 33.7756, // Default location (e.g., Georgia Tech)
          longitude: -84.3963,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {sightings.map((sighting:CatSightingObject) => (
          <Marker
          key={sighting.id}
          coordinate={{
            latitude: sighting.latitude,
            longitude: sighting.longitude,
          }}
          title={sighting.name}
          description={sighting.info}
        />
        ))}
      </MapView>
      <Text style={textStyles.subHeading}> Extra Photos</Text>
      {imageUrls ? (imageUrls.map((url, index) => (
        <Image key={index} source={{ uri: url }} style={containerStyles.headlineImage} />))) : <Text>Loading images...</Text>}  
    </ScrollView>
  );
};