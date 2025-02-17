import React, { useState } from "react";
import { View, Text, TextInput, Image, Switch, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Alert } from "react-native";
import { router, useRouter } from "expo-router";
import { addDoc, collection, doc, getFirestore, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../logged-in/firebase";
import { Ionicons } from "@expo/vector-icons";
import { getStorage, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import MapView, { LatLng, Marker } from "react-native-maps";
import * as ImagePicker from 'expo-image-picker';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const CatReportScreen = () => {
    const [date, setDate] = useState<Date | null>(null);
    const [fed, setFed] = useState<boolean>(false);
    const [health, setHealth] = useState<boolean>(false);
    const [photoURL, setPhotoURL] = useState<string>('');
    const [info, setInfo] = useState<string>('');
    const [longitude, setLongitude] = useState<number>(-84.3963);
    const [latitude, setLatitude] = useState<number>(33.7756);
    const [name, setName] = useState<string>('');

    var location:LatLng = {
      latitude: latitude,
      longitude: longitude,
    };

  const handleTakePhoto = async () => {
    const { status, } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
    }

    let result = await ImagePicker.launchCameraAsync({
      quality: 1.0, // 100% quality, do not compress
    });

    if (!result.canceled) {
      setPhotoURL(result.assets[0].uri);
    }
  };

  const handleSelectPhoto = async () => {
    // Permissions check only needed for iOS 10
    const { status, } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need media library permissions to make this work!");
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      quality: 1.0, // 100% quality, do not compress
    });

    if (!result.canceled) {
      setPhotoURL(result.assets[0].uri);
    }
  };

  const handlePress = () => {
    Alert.alert(
      'Select Option',
      'Would you like to take a photo or select from your library?',
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: handleSelectPhoto,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSubmission = async () => {
    if (photoURL) {
      try {
        alert("Cat submission started...")

        // Create a blob from the image URI

        const response = await fetch(photoURL);
        const blob = response.blob();

        // // Why are we using XMLHttpRequest? See:
        // // https://github.com/expo/expo/issues/2402#issuecomment-443726662
        // const blob = await new Promise((resolve, reject) => {
        //   const xhr = new XMLHttpRequest();
        //   xhr.onload = function () {
        //     resolve(xhr.response);
        //   };
        //   xhr.onerror = function (e) {
        //     console.log(e);
        //     reject(new TypeError("Network request failed"));
        //   };
        //   xhr.responseType = "blob";
        //   xhr.open("GET", photo, true);
        //   xhr.send(null);
        // });

        console.log('Blob created:', blob);

        // Generate a unique filename for the image
        const filename = uuidv4();
        const filepath = "photos/" + filename
        const photoRef = ref(getStorage(), filepath);

        console.log('Photo reference created:', photoRef);

        // // Upload the blob with proper metadata
        // const metadata = {
        //   contentType: 'image/jpeg',
        // };

        // Upload the file
        await uploadBytes(photoRef, await blob);
        console.log('Upload successful');

        // // We're done with the blob, close and release it
        // blob.close();

        // Get the download URL
        const photoUri = await getDownloadURL(photoRef);
        console.log('Download URL:', photoUri);

        // Further processing with the photoURL...

        alert("Cat submitted successfully!");

        await addDoc(collection(db, 'cat_sightings'), {
          name,
          info,
          health,
          fed,
          photoURL,
          createdAt: new Date(),
        });

        const time_now = 0;
        const time = time_now;
        const lat = 0; // TODO: Actually add location
        const lng = 0;

        try {
          await addDoc(collection(db, 'cat-sightings'), {
            timestamp: serverTimestamp(),
            spotted_time: time, // currently unused, but we may want to distinguish
                                // upload and sighting time in the future
            latitude: lat,
            longitude: lng,
            name: name,
            image: filepath,
            info: info,
            healthy: health,
            fed: fed,
          });
        } catch (error) {
          if (error instanceof Error) {
            console.error("Error during upload:", error);
            alert(`Upload failed: ${error.message}`);
          }
        }

      } catch (error) {
        if (error instanceof Error) {
          console.error("Error during upload:", error);
          alert(`Upload failed: ${error.message}`);
        }
      }
    } else {
      alert('Please select a photo.');
    }
  };
  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.inputContainer}>
          <Text style={styles.headline}>Report A New Cat Sighting</Text>
          <MapView
            style={{ width: '100%', height: 200, marginVertical: 10 }}
            initialRegion={{
              latitude: 33.7756,
              longitude: -84.3963,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress} // This updates the location correctly
          >
            {location && <Marker coordinate={location} />}
          </MapView>
            <TextInput 
              placeholder="Cat's name"
              onChangeText={setName} 
              style={styles.input} />
            <TextInput
              placeholder='Additional Info' 
              value={info} 
              onChangeText={setInfo} 
              style={styles.input} />
            <View style={styles.slider}>
              <Switch value={health} onValueChange={setHealth}/>
              <Text style={styles.sliderText}>Has been fed</Text> 
            </View>
            <View style={styles.slider}>
              <Switch value={fed} onValueChange={setFed} />
              <Text style={styles.sliderText}>Is in good health</Text>
            </View>
            <View style={styles.cameraView}>
              <TouchableOpacity style={styles.cameraButton} onPress={handlePress}>
                <Ionicons name="camera-outline" size={29} color={'#fff'} />
              </TouchableOpacity>
            </View>
            {photoURL && <Image source={{ uri: photoURL }} style={styles.selectedPreview} />}

            <TouchableOpacity style={styles.button} onPress={handleSubmission}>
              <Text style = {styles.buttonText}>Submit Sighting</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/logged-in')}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


export default CatReportScreen;

const styles = StyleSheet.create({
  headline: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
  },
  cameraView: {
    alignItems: 'center',
    paddingVertical: 20,  // Vertical padding
  },
  cameraButton: {
    width: 70,  // Width of the circle
    height: 70, // Height of the circle (same as width to make it circular)
    borderRadius: 35, // Half of width/height to make it circular
    backgroundColor: '#333', // Button color (blue)
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
    elevation: 5,  // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
    paddingVertical: 10,  // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
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
  selectedPreview: {
    margin: 'auto', // Center the image
    objectFit: 'scale-down', // Don't clip the image
    width: 240,
    height: 180,
  },

});

