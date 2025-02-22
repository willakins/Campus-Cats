import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, Switch, Button, ActivityIndicator, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { auth, db, storage } from "../logged-in/firebase";
import MapView, { LatLng, Marker } from "react-native-maps";
import { deleteObject, getDownloadURL, ref } from "firebase/storage";
import { getAuth } from "firebase/auth";

const CatSightingScreen = () => {
  //Check if admin, then set passed parameters from map screen
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Pull params from router
  const { docId, catDate, catFed, catHealth, catInfo, catPhoto, catLongitude, catLatitude, catName} = useLocalSearchParams();

  // Convert params to right type (Frick you Typescript!!)

  const docRef:string = docId as string;
  const [date, setDate] = useState<Date>(new Date(JSON.parse(catDate as string)));
  const [fed, setFed] = useState<boolean>(JSON.parse(catFed as string));
  const [health, setHealth] = useState<boolean>(JSON.parse(catHealth as string));
  const [photoURL, setPhotoURL] = useState<string | null>(catPhoto as string);
  const [info, setInfo] = useState<string>(catInfo as string);
  const [longitude, setLongitude] = useState<number>(parseFloat(catLongitude as string));
  const [latitude, setLatitude] = useState<number>(parseFloat(catLatitude as string));
  const [name, setName] = useState<string>(catName as string);
  const [photoImage, setPhotoImage] = useState<string | null>(null);

  var location:LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  const [adminStatus, setAdminStatus] = useState<boolean>(false); 
  
  const getImageUrl = async (imagePath: string) => {
    try {
      // Create a reference to the file in Firebase Storage
      const imageRef = ref(storage, imagePath);  // The path to the image in Storage
      
      // Get the download URL of the image
      const url = await getDownloadURL(imageRef);
      
      // Return the image URL
      return url;
    } catch (error) {
      console.error("Error getting image URL:", error);
      return null;
    }
  };
  const fetchImage = async () => {
    if (photoURL){
      const url = await getImageUrl(photoURL); // Get the image URL
      setPhotoImage(url); // Update the state with the image URL
    }
    
  };

  
  useEffect(() => {
    fetchImage();
  }, []);

  // Following function checks for admin status
  useEffect(() => {
    setUserRole();
  }, []);
  const setUserRole = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        setAdminStatus(userRole === 1 || userRole === 2);
      } else {
        console.log("No user document found!");
      }
    }
  };

  const saveSighting = async () => {
    const stamp = Timestamp.fromDate(date);
    if (!docRef) {
      alert("Error: docRef is undefined!");
      return;
    }

    const sightingRef = doc(db, "cat-sightings", docRef);

    try {
      const docSnap = await getDoc(sightingRef);
      if (!docSnap.exists()) {
        alert("Error: Document does not exist!");
        return;
      }

      await updateDoc(sightingRef, {
        timestamp: stamp,
        fed,
        health,
        image: photoURL,
        info,
        longitude,
        latitude,
        name,
      });

      alert("Saved!");
      router.push('/logged-in')
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert("Error saving sighting: " + error.message);
        console.error("Firestore update error:", error);
      } else {
        alert("Unknown error occurred.");
        console.error("Unknown error:", error);
      }
    }
  };


  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }
  const deleteSighting = async () => {
    try {
      if (photoURL) {
        // Reference to the file in Firebase Storage
        const imageRef = ref(storage, photoURL);
  
        // Delete the image from storage
        await deleteObject(imageRef);
        console.log("Image deleted successfully.");
      }
      await deleteDoc(doc(db, "cat-sightings", docRef));
      alert("Cat sighting deleted successfully!");
      router.push('/logged-in');
    } catch (error) {
      console.error("Error deleting sighting:", error);
      alert("Failed to delete sighting.");
    }
  };

  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };
  // Now display the sighting for either admin or general user
  return (
    <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
          >
      <ScrollView contentContainerStyle={styles.scrollView}>
        {isAdmin && <TouchableOpacity style={styles.deleteButton} onPress={deleteSighting}>
            <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>}
        {!isAdmin && <Text style={styles.headline}>View A Cat Sighting</Text>}
        {isAdmin && <Text style={styles.headline}>Edit A Cat Sighting</Text>}
        <View style={styles.container}>
          {photoImage ? (
            <Image source={{ uri: photoImage }} style={styles.catImage} />
          ) : (
            <Text style={styles.catImage}>Loading image...</Text>
          )}
          <View style={styles.inputContainer}>
            {isAdmin && <MapView
            style={{ width: '100%', height: 150, marginVertical: 10 }}
            initialRegion={{
              latitude: 33.7756,
              longitude: -84.3963,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress} // This updates the location correctly
          >
            {location && <Marker coordinate={location} />}
          </MapView>}
            <Text style={styles.sliderText}>Cat's Name</Text>
            <TextInput 
            value={name} 
            onChangeText={setName} 
            editable={isAdmin} 
            style={styles.input} />
            <Text style={styles.sliderText}>Additional Info</Text>
            <TextInput 
            value={info} 
            onChangeText={setInfo} 
            editable={isAdmin} 
            style={styles.input} />
            <Text style={styles.sliderText}>Date Sighted</Text>
            <TextInput 
            value={date.toString()} 
            onChangeText={setInfo} 
            editable={isAdmin} 
            style={styles.input} />
            <View style={styles.slider}>
              <Switch value={health} onValueChange={setHealth} disabled={!isAdmin}/>
              <Text style={styles.sliderText}>Has been fed</Text> 
            </View>
            <View style={styles.slider}>
              <Switch value={fed} onValueChange={setFed} disabled={!isAdmin} />
              <Text style={styles.sliderText}>Is in good health</Text>
            </View>
            </View>
        </View>
      </ScrollView>
      {isAdmin && <TouchableOpacity style={styles.button} onPress={saveSighting}>
              <Text style = {styles.buttonText}>Save</Text>
            </TouchableOpacity>}
            <TouchableOpacity style={styles.button} onPress={() => router.push('/logged-in')}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};


export default CatSightingScreen;

const styles = StyleSheet.create({
  deleteButton: {
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
  headline: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
  },
  sliderText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    padding: 5,
  },
  slider: { 
    flexDirection: "row", 
    alignItems: "center",
    padding: 3
  },
  catImage: { 
    width: "100%", 
    height: 200, 
    borderRadius: 10,
    justifyContent: 'center',
    textAlign: 'center',
    flex: 1,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    justifyContent: 'center',
  },
  container: {
    justifyContent: 'center',
    backgroundColor: '#fff', 
    padding: 5
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
    paddingVertical: 0,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    height: 30,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    margin: 5,
    display: 'flex',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',

  },
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    textAlign: 'center',
  },
  
});