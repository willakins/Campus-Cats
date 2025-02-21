// CatalogEntry.js
import { storage } from '@/app/logged-in/firebase';
import { CatalogEntryObject } from '@/types/CatalogEntryObject';
import { getDownloadURL, listAll, ref } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import MapView, { Marker } from "react-native-maps";

const CatalogEntry: React.FC<CatalogEntryObject> = ({ id, name, profilePhoto, info, most_recent_sighting }) => {
  const [profileURL, setProfile] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const fetchImages = async () => {
    try {
      const imagesRef = ref(storage, `cats/${name}`);  // Path to the cat's folder
      const result = await listAll(imagesRef); // List all files in the folder

      // Fetch the download URLs of all the images in the folder
      const urls = await Promise.all(
        result.items.map(itemRef => getDownloadURL(itemRef)) // Get URL for each image
      );
      setImageUrls(urls);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  const getImageUrl = async (imagePath: string) => {
        try {
          // Create a reference to the file in Firebase Storage
          const imageRef = ref(storage, imagePath);  // The path to the image in Storage
          
          // Get the download URL of the image
          const url = await getDownloadURL(imageRef);
          
          // Return the image URL
          return url;
        } catch (error) {
          console.error("Error getting image URL:", error);
          return null;
        }
      };
      
  const fetchImage = async () => {
      if (profilePhoto){
        const url = await getImageUrl(profilePhoto); // Get the image URL
        setProfile(url); // Update the state with the image URL
      }
  };
  useEffect(() => {
    fetchImage();
    fetchImages();
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
            {most_recent_sighting && <Marker coordinate={most_recent_sighting} />}
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

export default CatalogEntry;
