import React, { useEffect, useState } from 'react';
import { Text, Image, View } from 'react-native';

import MapView, { Marker } from 'react-native-maps';

import DatabaseService from '../../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button } from '../ui/Buttons';
import { CatalogEntry, Sighting } from '@/types';
import { getSelectedCatalogEntry } from '@/stores/CatalogEntryStores';

const CatalogEntryElement: React.FC = () => {
  const [profile, setProfile] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const database = DatabaseService.getInstance();  
  const entry = getSelectedCatalogEntry();

  useEffect(() => {
    database.fetchCatImages(entry.id, setProfile, setPhotos);
    database.getSightings(entry.cat.name, setSightings);
  }, []);

  return (
    <View style={containerStyles.card}>
      <Text style={textStyles.titleCentered}>{entry.cat.name}</Text>
      <Text style={[textStyles.detail, {alignSelf:'center'}]}> {entry.cat.descShort} </Text>
      {profile ? (<Image source={{ uri: profile }} style={containerStyles.imageMain} resizeMode="cover"/>) : 
                <Text style={textStyles.titleCentered}>Loading image...</Text>}
      <Text style={textStyles.label}>Description</Text>
      <Text style={textStyles.detail}>{entry.cat.descLong}</Text>
      <Text style={textStyles.label}> Sightings </Text>
      <MapView
        style={containerStyles.mapContainer}
        initialRegion={{
          latitude: 33.7756, // Default location (e.g., Georgia Tech)
          longitude: -84.3963,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {sightings.map((sighting:Sighting) => (
          <Marker
          key={sighting.id}
          coordinate={sighting.location}
          title={sighting.name}
          description={sighting.info}
        />
        ))}
      </MapView>
      <Button style={[buttonStyles.bigButton, {height:45}]}onPress={() => setShowDetails(!showDetails)}>
        <Text style={textStyles.bigButtonText}> {showDetails ? "Show less details": "Show more details"}</Text>
      </Button>
      {showDetails ? <><Text style={textStyles.label}>Detailed Color Pattern</Text>
      <Text style={textStyles.detail}>{entry.cat.colorPattern}</Text>
      {entry.cat.behavior.length > 0 ? <><Text style={textStyles.label}>Behavior</Text>
      <Text style={textStyles.detail}>{entry.cat.behavior}</Text></>:null}

      <Text style={textStyles.label}>Years Recorded</Text>
      <Text style={textStyles.detail}>{entry.cat.yearsRecorded}</Text>
      <Text style={textStyles.label}>Area of Residence</Text>
      <Text style={textStyles.detail}>{entry.cat.AoR}</Text>
      <Text style={textStyles.label}>Current Status</Text>
      <Text style={textStyles.detail}>{entry.cat.currentStatus}</Text>
      <Text style={textStyles.label}>Fur Length</Text>
      <Text style={textStyles.detail}>{entry.cat.furLength}</Text>
      <Text style={textStyles.label}>Fur Pattern</Text>
      <Text style={textStyles.detail}>{entry.cat.furPattern}</Text>
      <Text style={textStyles.label}>Tnr</Text>
      <Text style={textStyles.detail}>{entry.cat.tnr}</Text>
      <Text style={textStyles.label}>Sex</Text>
      <Text style={textStyles.detail}>{entry.cat.sex}</Text>

      {entry.credits.length > 0 ? <><Text style={textStyles.label}>Sources and Credits</Text>
      <Text style={textStyles.detail}>{entry.credits}</Text></>: null}</>: null}
      {photos.length > 0 && (
              <>
                  <Text style={textStyles.sectionTitle}>Extra Photos</Text>
                  {photos.map((url, index) => (
                  <Image key={index} source={{ uri: url }} style={containerStyles.imageMain} />
                  ))}
              </>
              )} 
      <View style={containerStyles.footer}>
        <Text style={textStyles.footerText}>{CatalogEntry.getDateString(entry)}</Text>
      </View>
    </View>
  )
}
export { CatalogEntryElement };