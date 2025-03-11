import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Image, ScrollView } from 'react-native';

import { getDownloadURL, listAll, ref } from 'firebase/storage';
import MapView, { Marker } from 'react-native-maps';

import { CatalogEntryObject } from '@/types/CatalogEntryObject';
import { db, storage } from '@/config/firebase';
import { CatSightingObject } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const CatalogEntry: React.FC<CatalogEntryObject> = ({ id, name, info }) => {
  const [profileURL, setProfile] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [sightings, setSightings] = useState<CatSightingObject[]>([]);

  const getSightings = async (catName: string) => {
    try {
      // Create ref, create query, search firestore with query at reference
      const sightingsRef = collection(db, 'cat-sightings');
      const q = query(sightingsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);

      // Map each successful query to cat sighting
      const catSightings: CatSightingObject[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().spotted_time.toDate(),
        fed: doc.data().fed,
        health: doc.data().health,
        photoUri: doc.data().image,
        info: doc.data().info,
        latitude: doc.data().latitude,
        longitude: doc.data().longitude,
        name: doc.data().name
        // Include the document ID
      }));
      setSightings(catSightings);
    } catch (error) {
      console.error('Error fetching cat sightings: ', error);
    }
  };

  const fetchCatImages = async (catName: string) => {
    try {
      const folderRef = ref(storage, `cats/${catName}/`);

      // List all images in the folder
      const result = await listAll(folderRef);

      let profilePicUrl = '';
      let extraPicUrls: string[] = [];

      for (const itemRef of result.items) {
        const url = await getDownloadURL(itemRef);

        // Check if this is the profile picture
        if (itemRef.name.includes('_profile')) {
          profilePicUrl = url;
        } else {
          extraPicUrls.push(url);
        }
      }
      setProfile(profilePicUrl);
      setImageUrls(extraPicUrls);
    } catch (error) {
      console.error('Error fetching images: ', error);
    }
  };

  useEffect(() => {
    fetchCatImages(name);
    getSightings(name);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.entryContainer}>
      <Text style={styles.title}>{name}</Text>
      {profileURL ? (<Image source={{ uri: profileURL }} style={styles.image} resizeMode="contain" />) : 
        <Text style={styles.title}>Loading image...</Text>}
      <Text style={styles.description}>{info}</Text>
      <Text style={styles.subHeading}> Most Recent Sighting</Text>
      <MapView
        style={styles.map}
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
      <Text style={styles.subHeading}> Extra Photos</Text>
      {imageUrls ? (imageUrls.map((url, index) => (
        <Image key={index} source={{ uri: url }} style={styles.image} />))) : <Text>Loading images...</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%', 
    height: 200, 
    paddingHorizontal: 15, 
    borderRadius:10,
    marginBottom: 10,
  },
  subHeading: {
    fontSize: 20,
    color: '#000',
    textAlign: 'center',
    marginBottom: 0
  },
  entryContainer: {
    flexDirection: 'column', // Stack items vertically
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    marginBottom: 20, // Space between catalog entries
    padding: 5,
    borderRadius:10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  image: {
    width: 400,  // Set a fixed width for the profile picture
    height: 250, // Set a fixed height for the profile picture
    borderRadius: 60,  // Makes the image circular
    marginTop: 10,
    paddingHorizontal: 20,
  },
  textContainer: {
    alignItems: 'center', // Center text horizontally
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5, // Space between title and description
  },
  description: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginHorizontal: 10, // Add some horizontal padding for better readability
    marginBottom: 20,
    marginTop: -20,
  },
});
