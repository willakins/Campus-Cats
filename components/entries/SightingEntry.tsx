import React from 'react';
import { Image, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Checkbox } from 'react-native-paper';

import { Sighting } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { containerStyles, textStyles } from '@/styles';

interface SightingEntryProps {
  readonly sighting: Sighting;
  readonly media: readonly StoredMediaAsset[];
}

const formatSightingDate = (sighting: Sighting): string =>
  `${sighting.timeOfDay} of ${sighting.date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;

const SightingEntry: React.FC<SightingEntryProps> = ({ sighting, media }) => {
  const profile = media.find(({ role }) => role === 'profile');
  const gallery = media.filter(({ role }) => role === 'gallery');

  return (
    <View style={containerStyles.card}>
      {profile ? (
        <Image source={{ uri: profile.url }} style={containerStyles.imageMain} />
      ) : (
        <View style={containerStyles.imageMain}>
          <Text style={textStyles.listTitle}>No profile photo</Text>
        </View>
      )}
      <Text style={textStyles.label}>Location</Text>
      <MapView
        style={containerStyles.mapContainer}
        initialRegion={{
          ...sighting.location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={sighting.location} />
      </MapView>

      <Text style={textStyles.label}>Cat&apos;s Name</Text>
      <Text style={textStyles.detail}>{sighting.name}</Text>
      <Text style={textStyles.label}>Time of Sighting</Text>
      <Text style={textStyles.detail}>{formatSightingDate(sighting)}</Text>

      {sighting.info ? (
        <>
          <Text style={textStyles.label}>Additional Notes</Text>
          <Text style={textStyles.detail}>{sighting.info}</Text>
        </>
      ) : null}

      <View style={containerStyles.sectionCard}>
        <View style={containerStyles.rowStack}>
          <View style={containerStyles.rowContainer}>
            <Text
              style={[
                textStyles.detail,
                { color: sighting.fed ? 'green' : 'red' },
              ]}
            >
              {sighting.fed ? 'Was fed' : 'Not fed'}
            </Text>
            <Checkbox status={sighting.fed ? 'checked' : 'unchecked'} color="green" />
          </View>
          <View style={containerStyles.rowContainer}>
            <Text
              style={[
                textStyles.detail,
                { color: sighting.health ? 'green' : 'red' },
              ]}
            >
              {sighting.health ? 'Was healthy' : 'Not healthy'}
            </Text>
            <Checkbox
              status={sighting.health ? 'checked' : 'unchecked'}
              color="green"
            />
          </View>
        </View>
      </View>

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
        <Text style={textStyles.footerText}>Author: {sighting.createdBy.id}</Text>
      </View>
    </View>
  );
};

export { SightingEntry };
