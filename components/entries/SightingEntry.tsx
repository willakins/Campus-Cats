import React, { useEffect, useState } from 'react';
import { Text, Image, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Checkbox } from 'react-native-paper';

import DatabaseService from '../../services/DatabaseService';
import { getSelectedSighting } from '@/stores/sightingStores';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Sighting } from '@/types';

const SightingEntry: React.FC = () => {
  const database = DatabaseService.getInstance();  
  const sighting = getSelectedSighting();
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState<string>('');
  
  useEffect(() => {
    database.fetchSightingImages(sighting.id, setProfile, setPhotos);
  }, []);

  return (
    <View style={containerStyles.card}>
        {profile.length > 0 ? (<Image source={{ uri: profile }} style={containerStyles.imageMain} />) : (
            <Text style={textStyles.titleCentered}>Loading image...</Text>)}
        <Text style={textStyles.label}>Location</Text>
        <MapView
        style={containerStyles.mapContainer}
        initialRegion={{
            latitude: 33.7756,
            longitude: -84.3963,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }}
        >
        <Marker coordinate={sighting.location} />
        </MapView>

        <Text style={textStyles.label}>Cat's Name</Text>
        <Text style={textStyles.detail}>{sighting.name}</Text>

        <Text style={textStyles.label}>Time of Sighting</Text>
        <Text style={textStyles.detail}>{Sighting.getDateString(sighting)}</Text>

        {sighting.info.length > 0 ? <><Text style={textStyles.label}>Additional Notes</Text>
        <Text style={textStyles.detail}>{sighting.info}</Text></>:null}

        <View style={containerStyles.sectionCard}>
            <View style={containerStyles.rowStack}>
                <View style={containerStyles.rowContainer}>
                    <Text style={[textStyles.statusText,{ color: sighting.fed ? "green" : "red" }]}>{sighting.fed ? "Was fed" : "Not fed"}</Text>
                    <Checkbox
                        status={sighting.fed ? "checked" : "unchecked"}
                        color="green"
                        />
                </View>
                <View style={containerStyles.rowContainer}>
                    <Text style={[textStyles.statusText, { color: sighting.health ? "green" : "red" }]}>
                        {sighting.health ? "Was healthy" : "Not healthy"}</Text>
                        <Checkbox
                        status={sighting.health ? "checked" : "unchecked"}
                        color="green"
                        />
                </View>
            </View>
        </View>
        {photos.length > 0 && (
        <>
            <Text style={textStyles.sectionTitle}>Extra Photos</Text>
            {photos.map((url, index) => (
            <Image key={index} source={{ uri: url }} style={containerStyles.imageMain} />
            ))}
        </>
        )}
        <View style={containerStyles.footer}>
            <Text style={textStyles.footerText}>Author: {sighting.createdBy.id}</Text>
        </View>
    </View>
  );
};
export { SightingEntry };