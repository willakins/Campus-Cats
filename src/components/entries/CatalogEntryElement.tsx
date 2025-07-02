import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Button } from '../common';

import DatabaseService from '@/services/DatabaseService';
import { getSelectedCatalogEntry } from '@/stores/CatalogEntryStores';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { CatalogEntry, Sighting } from '@/types';

const CatalogEntryElement: React.FC = () => {
  const [profile, setProfile] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const database = DatabaseService.getInstance();
  const entry = getSelectedCatalogEntry();

  useEffect(() => {
    void database.fetchCatImages(entry.id, setProfile, setPhotos);
    void database.getSightings(entry.cat.name, setSightings);
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.cardTitle, { textAlign: 'center' }]}>
        {entry.cat.name}
      </Text>
      {profile ? (
        <Image
          source={{ uri: profile }}
          style={containerStyles.imageMain}
          resizeMode="cover"
        />
      ) : (
        <View style={containerStyles.imageMain}>
          <Text style={textStyles.listTitle}>Loading...</Text>
        </View>
      )}
      <Text style={[textStyles.detail, { alignSelf: 'center' }]}>
        {' '}
        {entry.cat.descShort}{' '}
      </Text>
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
        {sightings.map((sighting: Sighting) => (
          <Marker
            key={sighting.id}
            coordinate={sighting.location}
            title={sighting.name}
            description={sighting.info}
          />
        ))}
      </MapView>
      <Button onPress={() => setShowDetails(!showDetails)}>
        {' '}
        {showDetails ? 'Show less details' : 'Show more details'}
      </Button>
      {showDetails ? (
        <>
          <Text style={textStyles.label}>Detailed Color Pattern</Text>
          <Text style={textStyles.detail}>{entry.cat.colorPattern}</Text>
          {entry.cat.behavior.length > 0 ? (
            <>
              <Text style={textStyles.label}>Behavior</Text>
              <Text style={textStyles.detail}>{entry.cat.behavior}</Text>
            </>
          ) : null}

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

          {entry.credits.length > 0 ? (
            <>
              <Text style={textStyles.label}>Sources and Credits</Text>
              <Text style={textStyles.detail}>{entry.credits}</Text>
            </>
          ) : null}
        </>
      ) : null}
      {photos.length > 0 && (
        <>
          <Text style={textStyles.label}>Extra Photos</Text>
          {photos.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={containerStyles.imageMain}
            />
          ))}
        </>
      )}
      <View style={containerStyles.footer}>
        <Text style={textStyles.footerText}>Author: {entry.createdBy.id}</Text>
        <Text style={textStyles.footerText}>
          {CatalogEntry.getDateString(entry)}
        </Text>
      </View>
    </View>
  );
};
export { CatalogEntryElement };
