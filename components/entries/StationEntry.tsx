import React from 'react';
import { Image, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Station, StationStockStatus } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { containerStyles, textStyles } from '@/styles';

interface StationEntryProps {
  readonly station: Station;
  readonly status: StationStockStatus;
  readonly media: readonly StoredMediaAsset[];
}

export const StationEntry: React.FC<StationEntryProps> = ({ station, status, media }) => {
  const profile = media.find(({ role }) => role === 'profile');
  const gallery = media.filter(({ role }) => role === 'gallery');
  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.cardTitle, { textAlign: 'center' }]}>{station.name}</Text>
      {profile ? (
        <Image
          source={{ uri: profile.url }}
          style={containerStyles.imageMain}
          resizeMode="cover"
        />
      ) : null}
      <Text style={textStyles.label}>Location</Text>
      <MapView
        style={containerStyles.mapContainer}
        initialRegion={{ ...station.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        <Marker coordinate={station.location} />
      </MapView>
      {station.knownCats ? (
        <>
          <Text style={textStyles.label}>Cats That Frequent This Station</Text>
          <Text style={textStyles.detail}>{station.knownCats}</Text>
        </>
      ) : null}
      {status.isStocked ? (
        <Text style={[textStyles.label, { textAlign: 'center', color: 'green' }]}>
          This station will need to be restocked in {status.daysRemaining} days.
        </Text>
      ) : (
        <Text style={[textStyles.label, { textAlign: 'center', color: 'red' }]}>
          This station needs to be restocked!
        </Text>
      )}
      {gallery.length > 0 ? (
        <>
          <Text style={textStyles.label}>Extra Photos</Text>
          {gallery.map((asset) => (
            <Image
              key={asset.id}
              source={{ uri: asset.url }}
              style={containerStyles.imageMain}
            />
          ))}
        </>
      ) : null}
      <View style={containerStyles.footer}>
        <Text style={textStyles.footerText}>Author: {station.createdBy.id}</Text>
      </View>
    </View>
  );
};
