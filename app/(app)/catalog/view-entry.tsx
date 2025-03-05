import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { LatLng } from 'react-native-maps';

import { Button, CatalogEntry } from '@/components';
import { auth, db } from '@/config/firebase';

const view_entry = () =>{
  const [adminStatus, setAdminStatus] = useState<boolean>(false); 
  const router = useRouter();
  const { paramId, paramName, paramInfo, paramLatitude, paramLongitude} = useLocalSearchParams();
  const id = paramId as string;
  const name = paramName as string;
  const info = paramInfo as string;
  const latitude = parseFloat(paramLatitude as string);
  const longitude = parseFloat(paramLongitude as string);
  var most_recent_sighting:LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  const handleBack = () => {
    router.push('/catalog');
  };
  const handleEdit = () => {
    router.push({
      pathname: '/catalog/edit-entry', // Dynamically navigate to the details page
      params: { paramId:id, paramName:name, paramInfo:info }, // Pass the details as query params
    });
  };

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

  return (
    <View>
      <Button style={styles.logoutButton} onPress={handleBack}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      {adminStatus ? <Button style={styles.editButton} onPress={handleEdit}>
        <Text style ={styles.editText}> Edit Entry</Text>
      </Button> : null}
      <CatalogEntry
        id={id}
        name={name}
        info={info}
        most_recent_sighting={most_recent_sighting}
      />
    </View>
  );
}

export default view_entry;

const styles = StyleSheet.create({
  logoutButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
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
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
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
