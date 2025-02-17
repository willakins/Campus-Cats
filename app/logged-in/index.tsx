import React, { useCallback, useEffect, useState } from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import MapView, { LatLng, Marker } from "react-native-maps";
import { useFocusEffect, useRouter, useNavigation } from "expo-router";
import { getDownloadURL, listAll, ref } from "firebase/storage";
import { db, storage } from "./firebase";
import { collection, DocumentData, getDocs } from "firebase/firestore";

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
  const [pins, setPins] = useState<CatSighting[]>([
    { id: "1", date: new Date('2025-02-10'), fed: true, health: true, info: "Friendly cat", latitude: 33.77780712288718, longitude: -84.39873117824166, photoUri: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.discoverwildlife.com%2Fanimal-facts%2Fmammals%2F6-key-behaviours-that-reveal-the-wild-ancestry-of-your-cat&psig=AOvVaw3Zoo2XOuw7Qmww1KtAy0f1&ust=1739118966851000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCJjU35PBtIsDFQAAAAAdAAAAABAE", name: "Whiskers"},
    { id: "2", date: new Date('2023-11-15'), fed: true, health: false, info: "Shy cat", latitude:  33.774097234804785, longitude: -84.39870972057157, photoUri: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.balisafarimarinepark.com%2Fbengal-tiger-the-power-beauty-and-more%2F&psig=AOvVaw13dz9FMTgVtbiSTQpJ-Gnh&ust=1739118990838000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCICMpqHBtIsDFQAAAAAdAAAAABAE", name: "Shadow"},
  ]);

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

  // Prevent going back to login page after logging in by using back button
  const navigation = useNavigation();
  useEffect(() => { 
    navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
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

      <MapView key = {mapKey} style={{ flex: 1 }} initialRegion={{ latitude: 33.776077, longitude: -84.396199, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
        {filteredPins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.name}
            description={pin.info}
            onPress={() => router.push({ pathname: '/sighting', params: { docId: pin.id, catDate: JSON.stringify(pin.date),
              catFed: pin.fed ? "true":"false", catHealth: pin.health ? "true":"false", catPhoto: pin.photoUri, 
              catInfo: pin.info, catLongitude: JSON.stringify(pin.longitude), catLatitude: JSON.stringify(pin.latitude),
              catName: pin.name} })}
          />
        ))}
      </MapView>
      <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/sighting/report')}>
        <Text style={styles.buttonText}>Report </Text>
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

// code for changing pins on the map-only can change if you created the pin
// import React, { useState, useEffect } from "react";
// import { TouchableOpacity, View, StyleSheet, Text, Alert } from "react-native";
// import MapView, { Marker } from "react-native-maps";
// import { useRouter } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getAuth } from "firebase/auth"; // Assuming Firebase authentication

// const HomeScreen = () => {
//   const router = useRouter();
//   const [filter, setFilter] = useState("all");
//   const [userId, setUserId] = useState(null); // Stores the logged-in user's ID
//   const [pins, setPins] = useState([
//     {
//       id: 1,
//       latitude: 33.77780712288718,
//       longitude: -84.39873117824166,
//       name: "Whiskers",
//       info: "Friendly cat",
//       health: true,
//       fed: false,
//       date: "2025-02-10",
//       createdBy: "user123", // Example of a username or UID
//     },
//     {
//       id: 2,
//       latitude: 33.774097234804785,
//       longitude: -84.39870972057157,
//       name: "Shadow",
//       info: "Shy cat",
//       health: false,
//       fed: true,
//       date: "2023-11-15",
//       createdBy: "user456",
//     },
//   ]);

//   // Fetch the logged-in user’s identifier
//   useEffect(() => {
//     const getUserId = async () => {
//       const storedUserId = await AsyncStorage.getItem("userId");
//       if (storedUserId) {
//         setUserId(storedUserId);
//       }
//     };
//     getUserId();
//   }, []);

//   const handleDragEnd = (id, event, createdBy) => {
//     if (createdBy !== userId) {
//       Alert.alert("Permission Denied", "You can only move pins that you created.");
//       return;
//     }

//     const { latitude, longitude } = event.nativeEvent.coordinate;

//     Alert.alert(
//       "Confirm Location Change",
//       "Are you sure you want to update this pin's location?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Yes, Update",
//           onPress: () => {
//             setPins((prevPins) =>
//               prevPins.map((pin) => (pin.id === id ? { ...pin, latitude, longitude } : pin))
//             );
//           },
//         },
//       ],
//       { cancelable: true }
//     );
//   };

// =======
// import React, { useCallback, useEffect, useState } from "react";
// import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
// import MapView, { LatLng, Marker } from "react-native-maps";
// import { useFocusEffect, useRouter } from "expo-router";
// import { getDownloadURL, listAll, ref } from "firebase/storage";
// import { db, storage } from "./firebase";
// import { collection, DocumentData, getDocs } from "firebase/firestore";

// interface CatSighting {
//   id: string;
//   date: Date;
//   fed: boolean;
//   health: boolean;
//   photoUri: string;
//   info: string;
//   latitude: number;
//   longitude: number;
//   name: string;
// }

// const HomeScreen = () => {
//   const router = useRouter();
//   const [filter, setFilter] = useState('all');
//   const [mapKey, setMapKey] = useState(0);
//   const [pins, setPins] = useState<CatSighting[]>([
//     { id: "1", date: new Date('2025-02-10'), fed: true, health: true, info: "Friendly cat", latitude: 33.77780712288718, longitude: -84.39873117824166, photoUri: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.discoverwildlife.com%2Fanimal-facts%2Fmammals%2F6-key-behaviours-that-reveal-the-wild-ancestry-of-your-cat&psig=AOvVaw3Zoo2XOuw7Qmww1KtAy0f1&ust=1739118966851000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCJjU35PBtIsDFQAAAAAdAAAAABAE", name: "Whiskers"},
//     { id: "2", date: new Date('2023-11-15'), fed: true, health: false, info: "Shy cat", latitude:  33.774097234804785, longitude: -84.39870972057157, photoUri: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.balisafarimarinepark.com%2Fbengal-tiger-the-power-beauty-and-more%2F&psig=AOvVaw13dz9FMTgVtbiSTQpJ-Gnh&ust=1739118990838000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCICMpqHBtIsDFQAAAAAdAAAAABAE", name: "Shadow"},
//   ]);

//   const fetchPins = async  () => {
//     const querySnapshot = await getDocs(collection(db, 'cat-sightings'));
//     const pinsData: CatSighting[] = querySnapshot.docs.map(doc => ({
//       id: doc.id,
//       date: doc.data().spotted_time.toDate(),
//       fed: doc.data().fed,
//       health: doc.data().health,
//       photoUri: doc.data().image,
//       info: doc.data().info,
//       latitude: doc.data().latitude,
//       longitude: doc.data().longitude,
//       name: doc.data().name
//        // Include the document ID
//     }));
//     setPins(pinsData);
//     setMapKey(prev => prev + 1);
//   };

//   useFocusEffect(
//     useCallback(() => {
//       fetchPins();
//     }, [])
//   );

//   const filteredPins = pins.filter(pin => {
//     if (filter === 'all') return true;
//     const days = parseInt(filter);
//     const cutoffDate = new Date();
//     cutoffDate.setDate(cutoffDate.getDate() - days);
//     return new Date(pin.date) >= cutoffDate;
//   });
  
  
  
// >>>>>>> 58487f34421c377086b10ad071abd23121acaf65
//   return (
//     <View style={styles.container}>
//       <View style={styles.buttonGroup}>
//         {["7", "30", "90", "365", "all"].map((range) => (
//           <TouchableOpacity
//             key={range}
//             style={[styles.filterButton, filter === range && styles.activeButton]}
//             onPress={() => setFilter(range)}
//           >
//             <Text style={[styles.buttonText, filter === range && styles.activeText]}>
//               {range === "365" ? "1Y" : range === "all" ? "All" : `${range}D`}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>

// <<<<<<< HEAD
//       <MapView
//         style={{ flex: 1 }}
//         initialRegion={{
//           latitude: 33.776077,
//           longitude: -84.396199,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//       >
//         {pins.map((pin) => (
// =======
//       <MapView key = {mapKey} style={{ flex: 1 }} initialRegion={{ latitude: 33.776077, longitude: -84.396199, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
//         {filteredPins.map(pin => (
// >>>>>>> 58487f34421c377086b10ad071abd23121acaf65
//           <Marker
//             key={pin.id}
//             coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
//             title={pin.name}
//             description={pin.info}
// <<<<<<< HEAD
//             draggable={pin.createdBy === userId} // Only draggable if created by the logged-in user
//             onDragEnd={(event) => handleDragEnd(pin.id, event, pin.createdBy)}
//             onPress={() => router.push({ pathname: "/sighting", params: { cat: JSON.stringify(pin) } })}
//           />
//         ))}
//       </MapView>

//       <TouchableOpacity style={styles.reportButton} onPress={() => router.push("/sighting/report")}>
//         <Text style={styles.buttonText}>Report</Text>
// =======
//             onPress={() => router.push({ pathname: '/sighting', params: { docId: pin.id, catDate: JSON.stringify(pin.date),
//               catFed: pin.fed ? "true":"false", catHealth: pin.health ? "true":"false", catPhoto: pin.photoUri, 
//               catInfo: pin.info, catLongitude: JSON.stringify(pin.longitude), catLatitude: JSON.stringify(pin.latitude),
//               catName: pin.name} })}
//           />
//         ))}
//       </MapView>
//       <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/sighting/report')}>
//         <Text style={styles.buttonText}>Report </Text>
// >>>>>>> 58487f34421c377086b10ad071abd23121acaf65
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default HomeScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   buttonGroup: {
//     flexDirection: "row",
//     justifyContent: "center",
//     paddingVertical: 10,
//     backgroundColor: "#f0f0f0",
//   },
//   reportButton: {
//     position: "absolute",
//     bottom: 20,
//     left: "57%",
//     transform: [{ translateX: -75 }],
//     backgroundColor: "#007bff",
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 5,
//     elevation: 5,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 3.5,
//   },
//   filterButton: {
//     paddingVertical: 8,
//     paddingHorizontal: 15,
//     marginHorizontal: 5,
//     borderRadius: 20,
//     backgroundColor: "#e0e0e0",
//   },
//   activeButton: { backgroundColor: "#007bff" },
//   buttonText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
//   activeText: { color: "#fff" },
// });


