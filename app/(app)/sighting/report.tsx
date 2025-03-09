import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, } from 'react-native';

import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getStorage, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import MapView, { LatLng, MapPressEvent, Marker } from 'react-native-maps';

import { Button, CameraButton, DateTimeInput, TextInput } from '@/components';
import { db } from '@/config/firebase';
import { getMediaFromPicker, uploadFromURI } from '@/utils';

const CatReportScreen = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [fed, setFed] = useState<boolean>(false);
  const [health, setHealth] = useState<boolean>(false);
  const [photoURI, setPhotoURI] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [longitude, setLongitude] = useState<number>(-84.3963);
  const [latitude, setLatitude] = useState<number>(33.7756);
  const [name, setName] = useState<string>('');

  const router = useRouter();

  var location: LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  const handleTakePhoto = async () => {
    const assets = await getMediaFromPicker({
      requestPermissions: ImagePicker.requestCameraPermissionsAsync,
      pickMedia: ImagePicker.launchCameraAsync,
      pickMediaOptions: { quality: 1.0 }, // 100% quality, do not compress
      permissionsErrorMessage: 'Sorry, we need camera roll permissions to make this work!',
    });
    if (assets) {
      setPhotoURI(assets[0].uri);
    }
  };

  const handleSelectPhoto = async () => {
    const assets = await getMediaFromPicker({
      requestPermissions: ImagePicker.requestMediaLibraryPermissionsAsync,
      pickMedia: ImagePicker.launchImageLibraryAsync,
      pickMediaOptions: { quality: 1.0 }, // 100% quality, do not compress
      permissionsErrorMessage: 'Sorry, we need media library permissions to make this work!',
    });
    if (assets) {
      setPhotoURI(assets[0].uri);
    }
  };

  const handlePress = () => {
    Alert.alert(
      'Select Option',
      'Would you like to take a photo or select from your library?',
      [
        {
          text: 'Take Photo',
          onPress: () => handleTakePhoto(),
        },
        {
          text: 'Choose from Library',
          onPress: async () => await handleSelectPhoto(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const validateForm = () => {
    if (!photoURI) {
      return 'Please select a photo.';
    }
    if (name == '' || !date) {
      return 'Please enter all necessary information.';
    }

    // No errors
    return null;
  };

  const handleSubmission = async () => {
    const errors = validateForm();
    if (errors) {
      alert(errors);
      return;
    }

    try {
      const result = await uploadFromURI('photos/', photoURI);

      // TODO: It's possible for an image to be created but the database write
      // fails; find a way to either make the entire operation atomic, or
      // implement garbage collection on the storage bucket.
      await addDoc(collection(db, 'cat-sightings'), {
        timestamp: serverTimestamp(),
        spotted_time: Timestamp.fromDate(date), // currently unused, but we may want to distinguish
        // upload and sighting time in the future
        latitude: latitude,
        longitude: longitude,
        name: name,
        image: result.metadata.fullPath,
        info: info,
        healthy: health,
        fed: fed,
      });

      alert('Cat submitted successfully!');
      router.push('/(app)/(tabs)')

    } catch (error) {
      if (error instanceof Error) {
        console.error('Error during upload:', error);
        alert(`Upload failed: ${error.message}`);
      }
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
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
            <Text style={styles.headline}>Report A Cat Sighting</Text>
            <MapView
              style={{ width: '100%', height: 200, marginVertical: 10 }}
              initialRegion={{
                latitude: 33.7756, // Default location (e.g., Georgia Tech)
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress} // This updates the location correctly
            >
              {location ? <Marker coordinate={location} /> : null}
            </MapView>
            <DateTimeInput date={date} setDate={setDate}/>
            <TextInput
              placeholder="Cat's name"
              placeholderTextColor="#888"
              onChangeText={setName}
            />
            <TextInput
              placeholder="Additional Info"
              placeholderTextColor="#888"
              value={info}
              onChangeText={setInfo}
            />
            <View style={styles.slider}>
              <Switch value={health} onValueChange={setHealth}/>
              <Text style={styles.sliderText}>Has been fed</Text>
            </View>
            <View style={styles.slider}>
              <Switch value={fed} onValueChange={setFed} />
              <Text style={styles.sliderText}>Is in good health</Text>
            </View>
            <CameraButton onPhotoSelected={setPhotoURL}></CameraButton>
            {photoURL ? <Image source={{ uri: photoURL }} style={styles.selectedPreview} /> : null}
            <Button onPress={handleSubmission}>
              Submit Sighting
            </Button>
            <Button onPress={router.back}>
              Back
            </Button>
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
    textAlign: 'left',
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
    flexDirection: 'row',
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
  dateInput: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  selectedPreview: {
    margin: 'auto', // Center the image
    objectFit: 'scale-down', // Don't clip the image
    width: 240,
    height: 180,
  },
});
