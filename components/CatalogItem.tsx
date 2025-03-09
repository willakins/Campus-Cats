// CatalogItem.js
import React, { useEffect, useState } from 'react';
import { Image, Text, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { getDownloadURL, listAll, ref } from 'firebase/storage';

import { Button } from './ui/Buttons';
import { CatalogEntryObject } from '@/types';
import { storage } from '@/config/firebase';

export const CatalogItem: React.FC<CatalogEntryObject> = ({ id, name, info, most_recent_sighting }) => {
  const router = useRouter();
  const latitude = JSON.stringify(most_recent_sighting.latitude);
  const longitude = JSON.stringify(most_recent_sighting.longitude);
  const [profileURL, setProfile] = useState<string | null>(null);

  const fetchCatImages = async (catName: string) => {
    try {
      const folderRef = ref(storage, `cats/${catName}/`);

      // List all images in the folder
      const result = await listAll(folderRef);

      let profilePicUrl = '';

      for (const itemRef of result.items) {
        const url = await getDownloadURL(itemRef);

        // Check if this is the profile picture
        if (itemRef.name.includes('_profile')) {
          profilePicUrl = url;
          break;
        }
      }
      setProfile(profilePicUrl);
    } catch (error) {
      console.error('Error fetching images: ', error);
    }
  };

  useEffect(() => {
    fetchCatImages(name);
  }, []);

  // Handle onPress and navigate to the detail page
  const handlePress = () => {
    router.push({
      pathname: '/catalog/view-entry', // Dynamically navigate to the details page
      params: { paramId:id, paramName:name, paramInfo:info, paramLatitude:latitude, 
        paramLongitude:longitude}, // Pass the details as query params
    });
  };

  return (
    <Button style={styles.entryContainer} onPress={handlePress}>
      <View style={styles.entryElements}>
        <Text style={styles.title}>{name}</Text>
        {profileURL ? (<Image source={{ uri: profileURL }} style={styles.image} />) : 
          <Text style={styles.title}>Loading image...</Text>}
        <Text style={styles.description}>{info}</Text>
      </View>
    </Button>
  );
};

const styles = StyleSheet.create({
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
  entryElements: {
    flexDirection: "column", // Ensures each item is stacked vertically
    alignItems: "center",
  },
  image: {
    width: 250, // Set a fixed width for the image
    height: 150, // Set a fixed height for the image
    borderRadius: 40, // Make the image circular
    marginBottom: 10, // Space between image and text
  },
  textContainer: {
    alignItems: 'center', // Center text horizontally
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5, // Space between title and description
  },
  description: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginHorizontal: 10, // Add some horizontal padding for better readability
  },
});
export default CatalogItem;

