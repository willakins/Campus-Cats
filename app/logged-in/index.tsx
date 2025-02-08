import React, { useState } from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";

const HomeScreen = () => {
  const router = useRouter();
  const [pins, setPins] = useState([
    { id: 1, latitude: 33.77780712288718, longitude: -84.39873117824166, name: "Whiskers", image: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.discoverwildlife.com%2Fanimal-facts%2Fmammals%2F6-key-behaviours-that-reveal-the-wild-ancestry-of-your-cat&psig=AOvVaw3Zoo2XOuw7Qmww1KtAy0f1&ust=1739118966851000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCJjU35PBtIsDFQAAAAAdAAAAABAE", info: "Friendly cat", health: true, fed: false },
    { id: 2, latitude:  33.774097234804785, longitude: -84.39870972057157, name: "Shadow", image: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.balisafarimarinepark.com%2Fbengal-tiger-the-power-beauty-and-more%2F&psig=AOvVaw13dz9FMTgVtbiSTQpJ-Gnh&ust=1739118990838000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCICMpqHBtIsDFQAAAAAdAAAAABAE", info: "Shy cat", health: false, fed: true },
  ]);
  
  return (
    <View style={styles.container}>
      <MapView style={{ flex: 1 }} 
      initialRegion={{ latitude: 33.77607705084073, longitude:  -84.39619917316841, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.name}
            onPress={() => router.push({ 
              pathname: '/sighting', 
              params: {cat: JSON.stringify(pin) },
            })}
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
  buttonText: {
    color: '#fff',        // Text color
    fontSize: 18,         // Text size
    fontWeight: 'bold',   // Text boldness
  },
});