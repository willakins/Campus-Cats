import React, { useEffect, useState } from 'react';
import { Image, Text, ScrollView, View, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { LatLng, Marker } from 'react-native-maps';
import { Button } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { useAuth } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { Checkbox } from 'react-native-paper';
import { buttonStyles, textStyles, containerStyles } from '@/styles';
import { getSelectedSighting } from '@/stores/sightingStores';

const CatSightingScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const database = DatabaseService.getInstance();
  const sighting = getSelectedSighting();

  const fed = JSON.parse(catFed);
  const health = JSON.parse(catHealth);
  const longitude = parseFloat(catLongitude);
  const latitude = parseFloat(catLatitude);
  const [photos, setPhotos] = useState<string[]>([]);
  const isAuthorized = user.role === 1 || user.role === 2 || user.id === uid;
  const dateString = `${timeofDay} of ${date}`;

  const location: LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  useEffect(() => {
    database.fetchSightingImages(id, setPhotos);
  }, []);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

      <ScrollView contentContainerStyle={[containerStyles.scrollView, {paddingTop:'10%'}]}>
        <View style={containerStyles.card}>
          <Text style={textStyles.detail}>Created by: {uid}</Text>

          {photos.length > 0 ? (
            <Image source={{ uri: photos[0] }} style={containerStyles.imageMain} />
          ) : (
            <Text style={textStyles.titleCentered}>Loading image...</Text>
          )}

          <Text style={textStyles.label}>Location</Text>
          <MapView
            style={containerStyles.map}
            initialRegion={{
              latitude: 33.7756,
              longitude: -84.3963,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={location} />
          </MapView>

          <Text style={textStyles.label}>Cat's Name</Text>
          <Text style={textStyles.detail}>{name}</Text>

          <Text style={textStyles.label}>Time of Sighting</Text>
          <Text style={textStyles.detail}>{dateString}</Text>

          {info.length > 0 ? <><Text style={textStyles.label}>Additional Notes</Text>
          <Text style={textStyles.detail}>{info}</Text></>:null}

          <View style={containerStyles.sectionBox}>
            <View style={containerStyles.sectionRow}>
              <View style={containerStyles.rowItem}>
                <Text style={[
                  textStyles.statusText,
                  { color: fed ? "green" : "red" }
                ]}>
                  {fed ? "Was fed" : "Not fed"}
                </Text>
                <View style={containerStyles.checkWrap}>
                  <Checkbox
                    status={fed ? "checked" : "unchecked"}
                    color="green"
                  />
                </View>
              </View>

              <View style={containerStyles.rowItem}>
                <Text style={[
                  textStyles.statusText,
                  { color: health ? "green" : "red" }
                ]}>
                  {health ? "Was healthy" : "Not healthy"}
                </Text>
                <View style={containerStyles.checkWrap}>
                  <Checkbox
                    status={health ? "checked" : "unchecked"}
                    color="green"
                  />
                </View>
              </View>
            </View>
          </View>

          {photos.length > 1 && (
            <>
              <Text style={textStyles.sectionTitle}>Extra Photos</Text>
              {photos.slice(1).map((url, index) => (
                <Image key={index} source={{ uri: url }} style={containerStyles.imageMain} />
              ))}
            </>
          )}
        </View>

        
      </ScrollView>
      {isAuthorized && (
          <Button
            style={buttonStyles.button2}
            onPress={() => router.push({
              pathname: './edit-report',
              params: {
                id, paramDate:date,
                catFed: fed ? 'true' : 'false',
                catHealth: health ? 'true' : 'false',
                info, catLongitude,
                catLatitude, name, uid, timeofDay
              }
            })}
          >
            <Text style={textStyles.bigButtonText}>Edit</Text>
          </Button>
        )}
    </SafeAreaView>
  );
};

export default CatSightingScreen;
