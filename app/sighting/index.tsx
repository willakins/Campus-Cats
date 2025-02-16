import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, Switch, Button, ActivityIndicator, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../logged-in/firebase";
import MapView, { LatLng, Marker } from "react-native-maps";

const CatSightingScreen = () => {
  //Check if admin, then set passed parameters from map screen
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Pull params from router
  const { docId, catIdPassed, catName, catInfo, catHealth, catFed, catLocation, catDate, catPhoto } = useLocalSearchParams();

  // Convert params to right type (Frick you Typescript!!)
  const catName2:string = catName as string;
  const catInfo2:string = catInfo as string;
  const catHealth2:boolean = catHealth ? JSON.parse(catHealth as string) : false;
  const catId2:string = catIdPassed as string;
  const catFed2:boolean = catFed ? JSON.parse(catFed as string) : false;
  const catLocation2:LatLng = catLocation ? JSON.parse(catLocation as string) : null;
  const catDate2:Date = catDate ? JSON.parse(catDate as string) : null;
  const catPhoto2:string = catPhoto as string;
  const docRef:string = docId as string;

  //Create consts
  const [date, setDate] = useState(catDate2);
  const [fed, setFed] = useState(catFed2);
  const [health, setHealth] = useState(catHealth2);
  const [catId, setCatId] = useState(catId2);
  const [photo, setPhoto] = useState(catPhoto2);
  const [info, setInfo] = useState(catInfo2);
  const [name, setName] = useState(catName2);
  const [location, setLocation] = useState<LatLng | null>(catLocation2);
  

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // Get current user ID
        const user = auth.currentUser;
        if (!user) {
          console.error('User not logged in');
          setLoading(false);
          return;
        }

        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const { role } = userDoc.data();
          setIsAdmin(role === 1 || role === 2); // Admin roles are 1 or 2
        } else {
          console.error('User document does not exist');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  const saveSighting = async () => {
    await updateDoc(doc(db, 'cat_sightings', docRef), {
      date,
      fed,
      health,
      catId,
      photo,
      info,
      location,
      name
    });
    alert("Saved!");
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }
  // Now display the sighting for either admin or general user
  return (
    <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
          >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.container}>
          <Image source={{ uri: photo }} style={styles.catImage} />
          <View style={styles.inputContainer}>
            <Text style={styles.headline}>Edit A Cat Sighting</Text>
            {isAdmin && <MapView
            style={{ width: '100%', height: 200, marginVertical: 10 }}
            initialRegion={{
              latitude: 33.7756,
              longitude: -84.3963,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e) => setLocation(e.nativeEvent.coordinate)} // This updates the location correctly
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
            <View style={styles.slider}>
              <Switch value={health} onValueChange={setHealth} disabled={!isAdmin}/>
              <Text style={styles.sliderText}>Has been fed</Text> 
            </View>
            <View style={styles.slider}>
              <Switch value={fed} onValueChange={setFed} disabled={!isAdmin} />
              <Text style={styles.sliderText}>Is in good health</Text>
            </View>
            {isAdmin && <TouchableOpacity style={styles.button} onPress={saveSighting}>
              <Text style = {styles.buttonText}>Save</Text>
            </TouchableOpacity>}
            <TouchableOpacity style={styles.button} onPress={() => router.push('/logged-in')}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
            </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


export default CatSightingScreen;

const styles = StyleSheet.create({
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
    padding: 10,
  },
  slider: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  catImage: { 
    width: "100%", 
    height: 200, 
    borderRadius: 10,
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff', 
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    height: 40,
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
