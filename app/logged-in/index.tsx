import React, { useState } from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";

const HomeScreen = () => {
  const router = useRouter();
  const [pins, setPins] = useState([
    { id: 1, latitude: 37.78825, longitude: -122.4324, name: "Whiskers", image: "https://example.com/cat1.jpg", info: "Friendly cat", health: true, fed: false },
    { id: 2, latitude: 37.78925, longitude: -122.4354, name: "Shadow", image: "https://example.com/cat2.jpg", info: "Shy cat", health: false, fed: true },
  ]);
  
  const isAdmin = "true"; // Example role check
  return (
    <MapView style={{ flex: 1 }} initialRegion={{ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          title={pin.name}
          onPress={() => router.push({ 
            pathname: '/logged-in/sighting', 
            params: { isEditable: isAdmin, cat: JSON.stringify(pin) },
           })}
        />
      ))}
    </MapView>
  );
};

export default HomeScreen;
