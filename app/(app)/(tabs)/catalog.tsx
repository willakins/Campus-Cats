import React, {  useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import { Button, CatalogItem } from '@/components';
import { CatalogEntryObject } from '@/types';
import { auth, db } from '@/config/firebase'; // Import your firebase config

export default function Catalog() {
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntryObject[]>([]);
  const [adminStatus, setAdminStatus] = useState<boolean>(false); 
  const router = useRouter();

  const fetchCatalogData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'catalog'));
      const entries: CatalogEntryObject[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        info: doc.data().info,
      }));
      setCatalogEntries(entries);
    } catch (error) {
      console.error('Error fetching catalog data: ', error);
    }
  };

  useEffect(() => {
    fetchCatalogData()
  }, []);

  // Following function checks for admin status
  useEffect(() => {
    setUserRole();
  }, []);
  const setUserRole = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        setAdminStatus(userRole === 1 || userRole === 2);
      } else {
        console.log('No user document found!');
      }
    }
  };

  const handleCreate = () => {
    router.push('/catalog/create-entry')
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Catalog</Text>
      {adminStatus ? <Button style={styles.editButton} onPress={handleCreate}>
        <Text style ={styles.editText}> Create Entry</Text>
      </Button> : null}
      <ScrollView contentContainerStyle={styles.scrollView}>
        {catalogEntries.map((entry) => (
          <CatalogItem
            key={entry.id}
            id={entry.id}
            name={entry.name}
            info={entry.info}
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
