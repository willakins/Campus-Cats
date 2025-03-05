import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Image, ScrollView } from 'react-native';

import { getDownloadURL, listAll, ref } from 'firebase/storage';
import MapView, { Marker } from 'react-native-maps';

import { CatalogEntryObject } from '@/types/CatalogEntryObject';
import { storage } from '@/config/firebase';

export const CatalogEntry: React.FC<CatalogEntryObject> = ({ id, name, info, most_recent_sighting }) => {
  const [profileURL, setProfile] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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
        {most_recent_sighting ? <Marker coordinate={most_recent_sighting} /> : null}
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
