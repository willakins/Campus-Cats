import React, { useEffect, useState } from 'react';
import { Text, Image, ScrollView, View } from 'react-native';

import MapView, { Marker } from 'react-native-maps';

import { CatalogEntryObject } from '@/types/CatalogEntryObject';
import DatabaseService from '../../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button } from '../ui/Buttons';

export const CatalogEntry: React.FC<CatalogEntryObject> = 
  ({ id, name, descShort, descLong, colorPattern, behavior, yearsRecorded, AoR, currentStatus, furLength, furPattern, tnr, sex, credits }) => {
  const [profileURL, setProfile] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [sightings, setSightings] = useState<CatSightingObject[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const database = DatabaseService.getInstance();  

  useEffect(() => {
    database.fetchCatImages(id, setProfile, setImageUrls);
    database.getSightings(name, setSightings);
  }, []);

  return (
    <ScrollView contentContainerStyle={containerStyles.scrollView}>
      <Text style={textStyles.catalogTitle}>{name}</Text>
      <Text style={textStyles.subHeading}> {descShort} </Text>
      {profileURL ? (<Image source={{ uri: profileURL }} style={containerStyles.headlineImage} resizeMode='contain'/>) : 
        <Text style={textStyles.catalogTitle}>Loading image...</Text>}
      <Text style={textStyles.catalogLongDescription}>{descLong}</Text>
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
      <Button style={buttonStyles.button2}onPress={() => setShowDetails(!showDetails)}>
        <Text style={textStyles.bigButtonText}> {showDetails ? "Show less details": "Show more details"}</Text>
      </Button>
      {showDetails ? <><Text style={textStyles.headline}>Detailed Color Pattern</Text>
      <Text style={textStyles.catalogDescription}>{colorPattern}</Text>
      <Text style={textStyles.headline}>Behavior</Text>
      <Text style={textStyles.catalogDescription}>{behavior}</Text>

      <Text style={textStyles.headline}>Years Recorded</Text>
      <Text style={textStyles.catalogDescription}>{yearsRecorded}</Text>
      <Text style={textStyles.headline}>Area of Residence</Text>
      <Text style={textStyles.catalogDescription}>{AoR}</Text>
      <Text style={textStyles.headline}>Current Status</Text>
      <Text style={textStyles.catalogDescription}>{currentStatus}</Text>
      <Text style={textStyles.headline}>Fur Length</Text>
      <Text style={textStyles.catalogDescription}>{furLength}</Text>
      <Text style={textStyles.headline}>Fur Pattern</Text>
      <Text style={textStyles.catalogDescription}>{furPattern}</Text>
      <Text style={textStyles.headline}>Tnr</Text>
      <Text style={textStyles.catalogDescription}>{tnr}</Text>
      <Text style={textStyles.headline}>Sex</Text>
      <Text style={textStyles.catalogDescription}>{sex}</Text>

      {credits.length > 0 ? <><Text style={textStyles.headline}>Sources and Credits</Text>
      <Text style={textStyles.catalogDescription}>{credits}</Text></>: null}</>: null}
      {imageUrls.length > 0 ? <Text style={textStyles.subHeading}> Extra Photos</Text>: null}
      {imageUrls ? (imageUrls.map((url, index) => (
        <Image key={index} source={{ uri: url }} style={containerStyles.extraImage} resizeMode='contain'/>))) : <Text>Loading images...</Text>}  
    </ScrollView>
  );
};