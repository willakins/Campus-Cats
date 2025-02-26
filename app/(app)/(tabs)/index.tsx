import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import MapView, { Marker } from 'react-native-maps';

import { Button } from '@/components';
import { db } from '@/services/firebase';

interface CatSighting {
  id: string;
  date: Date;
  fed: boolean;
  health: boolean;
  photoUri: string;
  info: string;
  latitude: number;
  longitude: number;
  name: string;
}

const HomeScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<CatSighting[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchPins = async  () => {
        const querySnapshot = await getDocs(collection(db, 'cat-sightings'));
        const pinsData: CatSighting[] = querySnapshot.docs.map(doc => ({
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
        setPins(pinsData);
        setMapKey(prev => prev + 1);
      };

      fetchPins();
    }, [])
  );

  const filteredPins = pins.filter(pin => {
    if (filter === 'all') return true;
    const days = parseInt(filter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return new Date(pin.date) >= cutoffDate;
  });

  // TODO: Create a Google Cloud API Project
  // https://docs.expo.dev/versions/latest/sdk/map-view/#deploy-app-with-google-maps
  return (
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        {['7', '30', '90', '365', 'all'].map(range => (
          <Button
            key={range}
            style={[styles.filterButton, filter === range && styles.activeButton]}
            onPress={() => setFilter(range)}
            textStyle={[styles.buttonText, filter === range && styles.activeText]}
          >
            {range === '365' ? '1Y' : range === 'all' ? 'All' : `${range}D`}
          </Button>
        ))}
      </View>

      <MapView provider={Platform.OS === 'web' ? 'google' : undefined} key={mapKey} style={{ flex: 1 }} initialRegion={{ latitude: 33.776077, longitude: -84.396199, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
        {filteredPins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.name}
            description={pin.info}
            onPress={() => router.push({ pathname: '/sighting', params: {
              docId: pin.id,
              catDate: JSON.stringify(pin.date),
              catFed: pin.fed ? 'true':'false',
              catHealth: pin.health ? 'true':'false',
              catPhoto: pin.photoUri,
              catInfo: pin.info,
              catLongitude: JSON.stringify(pin.longitude),
              catLatitude: JSON.stringify(pin.latitude),
              catName: pin.name
            }})}
          />
        ))}
      </MapView>
      <Button
        style={styles.reportButton}
        onPress={() => router.push('/sighting/report')}
        textStyle={styles.buttonText}
      >
        Report
      </Button>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f0f0f0'
  },
  reportButton: {
    position: 'absolute', // Position the button absolutely
    bottom: 20,           // Adjust distance from the bottom of the screen
    left: '57%',          // Center horizontally
    transform: [{ translateX: -75 }], // Offset to make the button centered (since width is 150)
    backgroundColor: '#007bff', // Button background color
    paddingVertical: 10,  // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
    borderRadius: 5,      // Rounded corners
    elevation: 5,         // Shadow for Android
    shadowColor: '#000',  // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    marginVertical: 0,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  activeButton: {
    backgroundColor: '#007bff'
  },
  activeText: {
    color: '#fff'
  },
  buttonText: {
    fontSize: 18,
  },
});
