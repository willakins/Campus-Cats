import React, { useEffect, useState } from "react";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Import your firebase config
import { FlatList, Text, StyleSheet, View, Image, ScrollView } from 'react-native';
import CatalogEntry from '../../components/CatalogEntry';
import { collection, getDocs } from "firebase/firestore";

interface CatalogEntryObject {
  id: string;
  name: string;
  profilePhoto: string; //path to storage with photo
  info: string;
  most_recent_sighting: string; // document id for a cat sighting 
  extraPhotos: string; //path to a storage folder with other photos
  
}

export default function Catalog() {
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntryObject[]>([]);

  const fetchCatalogData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'catalog'));
      const entries: CatalogEntryObject[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        info: doc.data().info,
        profilePhoto: doc.data().profilePhoto,
        extraPhotos: doc.data().extraPhotos,
        most_recent_sighting: doc.data().mostRecentSighting
      }));
      setCatalogEntries(entries);
    } catch (error) {
      console.error('Error fetching catalog data: ', error);
    }
  };

  useEffect(() => {
    fetchCatalogData()
  }, []);

  return (
    <ScrollView style={styles.scrollView}>
      {catalogEntries.map((entry) => (
        <CatalogEntry
          key={entry.id}
          name={entry.name}
          profilePhoto={entry.profilePhoto}
          info={entry.info}
          recentSighting={entry.most_recent_sighting}
          extraPhotos={entry.extraPhotos}
        />
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
    list: {
      padding: 16,
    },
    item: {
      marginBottom: 16,
      padding: 20,
      backgroundColor: '#fff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
      flexDirection: 'row', // Align items horizontally
      alignItems: "center",
      justifyContent: 'center',
    },
    photoContainer: {
      flexDirection: 'row', // Align items horizontally
      marginBottom: 15,
      alignItems: "center",
      justifyContent: 'center',
    },
    image: {
      width: '50%', // Take up the full width of the container
      aspectRatio: 16 / 9, // Maintain a 16:9 aspect ratio
      borderRadius: 10,
      marginRight: 10,
    },
    container: {
      flexDirection: 'row', // Align items horizontally
      alignItems: 'center', // Vertically center the image and text
    },
    text: {
      fontSize: 15,
      marginRight: 50,
    },
  });
