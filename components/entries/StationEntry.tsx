import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import DatabaseService from '../../services/DatabaseService';

import { getSelectedStation } from '@/stores/stationStores';
import { containerStyles, textStyles } from '@/styles';
import { Station } from '@/types';

export const StationEntry: React.FC = () => {
  const database = DatabaseService.getInstance();

  const station = getSelectedStation();
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState<string>('');

  useEffect(() => {
    void database.fetchStationImages(station.id, setProfile, setPhotos);
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.cardTitle, { textAlign: 'center' }]}>
        {station.name}
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
      <Text style={textStyles.label}>Location</Text>
      <MapView
        style={containerStyles.mapContainer}
        initialRegion={{
          latitude: 33.7756, // Default location (e.g., Georgia Tech)
          longitude: -84.3963,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker key={station.id} coordinate={station.location} />
      </MapView>
      {station.knownCats.length > 0 ? (
        <>
          <Text style={textStyles.label}>Cats That Frequent This Station</Text>
          <Text style={textStyles.detail}>{station.knownCats}</Text>
        </>
      ) : null}
      {station.isStocked ? (
        <Text
          style={[textStyles.label, { textAlign: 'center', color: 'green' }]}
        >
          {' '}
          This station will need to be restocked in{' '}
          {Station.calculateDaysLeft(
            station.lastStocked,
            station.stockingFreq,
          )}{' '}
          days.
        </Text>
      ) : (
        <Text style={[textStyles.label, { textAlign: 'center', color: 'red' }]}>
          {' '}
          This station needs to be restocked!
        </Text>
      )}
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
        <Text style={textStyles.footerText}>
          Author: {station.createdBy.id}
        </Text>
      </View>
    </View>
  );
};
