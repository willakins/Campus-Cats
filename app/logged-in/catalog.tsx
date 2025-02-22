import React, { useContext, useEffect, useState } from "react";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Import your firebase config
import { FlatList, Text, StyleSheet, View, Image, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import CatalogItem from '../../components/CatalogItem';
import { collection, getDocs } from "firebase/firestore";
import { CatalogEntryObject } from "@/types/CatalogEntryObject";
import { useRouter } from "expo-router";
import { AdminContext } from "../AdminContext";

export default function Catalog() {
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntryObject[]>([]);
  const router = useRouter();
  const { adminStatus, setAdminStatus } = useContext(AdminContext);

  const fetchCatalogData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'catalog'));
      const entries: CatalogEntryObject[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        info: doc.data().info,
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
    alert(adminStatus)
  }, []);

  const handleCreate = () => {
    router.push
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Catalog</Text>
      {adminStatus && <TouchableOpacity style={styles.editButton} onPress={handleCreate}>
        <Text style ={styles.editText}> Create Entry</Text>
      </TouchableOpacity>}
      <ScrollView contentContainerStyle={styles.scrollView}>
        {catalogEntries.map((entry) => (
          <CatalogItem
            key={entry.id}
            id={entry.id}
            name={entry.name}
            info={entry.info}
            most_recent_sighting={entry.most_recent_sighting}
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
  editButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
  },
  logoutText: {
    color: '#fff',
    marginLeft: 5,
  },
  editText: {
    color: '#fff',
    marginLeft: 0,
  },
});