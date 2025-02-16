import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import MapView, { LatLng, Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { getDownloadURL, listAll, ref } from "firebase/storage";
import { db, storage } from "./firebase";
import { collection, DocumentData, getDocs } from "firebase/firestore";

interface CatSighting {
  date: Date;
  fed: boolean;
  health: boolean;
  catId: string;
  photoUri: string;
  info: string;
  location: LatLng;
  name: string;
}

const HomeScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [pins, setPins] = useState<CatSighting[] | null>([]);

  const fetchPins = async () => {
    const querySnapshot = await getDocs(collection(db, 'cat-sightings'));
    const pinsData: CatSighting[] = querySnapshot.docs.map(doc => ({
      ...(doc.data() as CatSighting),
      id: doc.id, // Include the document ID
    }));
    setPins(pinsData);
  };

  useEffect(() => {
    fetchPins(); // Fetch pins when the screen is loaded
  }, []);

  var filteredPins:DocumentData[] = [];
  if (pins) {
    filteredPins = pins.filter(pin => {
      if (filter === 'all') return true;
      const days = parseInt(filter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return new Date(pin.date) >= cutoffDate;
    });
  }
  
  return (

  
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        {['7', '30', '90', '365', 'all'].map(range => (
          <TouchableOpacity
            key={range}
            style={[styles.filterButton, filter === range && styles.activeButton]}
            onPress={() => setFilter(range)}
          >
            <Text style={[styles.buttonText, filter === range && styles.activeText]}>
              {range === '365' ? '1Y' : range === 'all' ? 'All' : `${range}D`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <MapView style={{ flex: 1 }} initialRegion={{ latitude: 33.776077, longitude: -84.396199, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
        {filteredPins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.name}
            description={pin.info}
            onPress={() => router.push({ pathname: '/sighting', params: { docId: pin.id, catID: pin.catId,  catName: pin.name, 
              catInfo: pin.info, catHealth: pin.health, catFed: pin.fed, catLocation: JSON.stringify(pin.location), 
              catDate: JSON.stringify(pin.date), catPhoto: pin.photoUri} })}
          />
        ))}
      </MapView>
      <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/sighting/report')}>
        <Text style={styles.buttonText}>Report</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1, // Map takes up the entire screen
  },
  buttonGroup: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#f0f0f0' },
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
  
  filterButton: { paddingVertical: 8, paddingHorizontal: 15, marginHorizontal: 5, borderRadius: 20, backgroundColor: '#e0e0e0' },
  activeButton: { backgroundColor: '#007bff' },
  buttonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  activeText: { color: '#fff' }
});