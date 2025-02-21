import React, { useEffect, useState } from "react";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Import your firebase config
import { FlatList, Text, StyleSheet, View, Image, ScrollView, SafeAreaView } from 'react-native';
import CatalogItem from '../../components/CatalogItem';
import { collection, getDocs } from "firebase/firestore";
import { CatalogEntryObject } from "@/types/CatalogEntryObject";

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
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Catalog</Text>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {catalogEntries.map((entry) => (
          <CatalogItem
            key={entry.id}
            id={entry.id}
            name={entry.name}
            profilePhoto={entry.profilePhoto}
            info={entry.info}
            most_recent_sighting={entry.most_recent_sighting}
            extraPhotos={entry.extraPhotos}
            />
        ))}
      </ScrollView>
    </SafeAreaView>
    
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F9',
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  scrollView: {
    padding: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F9',
  },
});