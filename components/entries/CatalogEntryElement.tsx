import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { CatalogEntry, Sighting } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

import { Button } from '../ui/Buttons';

interface CatalogEntryElementProps {
  readonly entry: CatalogEntry;
  readonly media: readonly StoredMediaAsset[];
  readonly sightings: readonly Sighting[];
}

const CatalogEntryElement: React.FC<CatalogEntryElementProps> = ({
  entry,
  media,
  sightings,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const profile = media.find(({ role }) => role === 'profile');
  const gallery = media.filter(({ role }) => role === 'gallery');

  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.cardTitle, { textAlign: 'center' }]}>
        {entry.cat.name}
      </Text>
      {profile ? (
        <Image
          source={{ uri: profile.url }}
          style={containerStyles.imageMain}
          resizeMode="cover"
        />
      ) : null}
      <Text style={[textStyles.detail, { alignSelf: 'center' }]}>
        {entry.cat.descShort}
      </Text>
      <Text style={textStyles.label}>Description</Text>
      <Text style={textStyles.detail}>{entry.cat.descLong}</Text>
      <Text style={textStyles.label}>Sightings</Text>
      <MapView
        style={containerStyles.mapContainer}
        initialRegion={{
          latitude: 33.7756,
          longitude: -84.3963,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {sightings.map((sighting) => (
          <Marker
            key={sighting.id}
            coordinate={sighting.location}
            title={sighting.name}
            description={sighting.info}
          />
        ))}
      </MapView>
      <Button
        style={buttonStyles.bigButton}
        onPress={() => setShowDetails((visible) => !visible)}
      >
        <Text style={textStyles.bigButtonText}>
          {showDetails ? 'Show less details' : 'Show more details'}
        </Text>
      </Button>
      {showDetails ? (
        <>
          <Text style={textStyles.label}>Detailed Color Pattern</Text>
          <Text style={textStyles.detail}>{entry.cat.colorPattern}</Text>
          {entry.cat.behavior ? (
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
          <Text style={textStyles.label}>TNR</Text>
          <Text style={textStyles.detail}>{entry.cat.tnr}</Text>
          <Text style={textStyles.label}>Sex</Text>
          <Text style={textStyles.detail}>{entry.cat.sex}</Text>
          {entry.credits ? (
            <>
              <Text style={textStyles.label}>Sources and Credits</Text>
              <Text style={textStyles.detail}>{entry.credits}</Text>
            </>
          ) : null}
        </>
      ) : null}
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
        <Text style={textStyles.footerText}>Author: {entry.createdBy.id}</Text>
        <Text style={textStyles.footerText}>
          Posted on {entry.createdAt.toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

export { CatalogEntryElement };
