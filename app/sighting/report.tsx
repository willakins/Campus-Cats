import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, Switch, Button, ActivityIndicator, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../logged-in/firebase";
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Ionicons } from "@expo/vector-icons";

const CatReportScreen = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [health, setHealth] = useState(false);
  const [fed, setFed] = useState(false);
  const [error, setError] = useState('');
  
  const handleTakePhoto = () => {
    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'back', // You can specify front or back camera
        quality: 0.5, // Camera quality (1.0 is the highest)
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled camera picker');
        } else if (response.errorCode) {
          console.log('Camera Error: ', response.errorMessage);
        } else {
          console.log('Photo taken: ', response.assets);
          // Handle the selected image (response.assets[0].uri)
        }
      }
    );
  };

  const handleSelectPhoto = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.5, // Image quality (1.0 is the highest)
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('Image Picker Error: ', response.errorMessage);
        } else {
          console.log('Selected photo: ', response.assets);
          // Handle the selected image (response.assets[0].uri)
        }
      }
    );
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

  return (
    <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
          >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.inputContainer}>
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
            <TouchableOpacity style={styles.cameraButton} onPress={handlePress}>
              <Ionicons name="camera-outline" size={29} color={'#fff'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => alert("Saved!")}>
              <Text style = {styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
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
  cameraButton: {
    width: 70,  // Width of the circle
    height: 70, // Height of the circle (same as width to make it circular)
    borderRadius: 35, // Half of width/height to make it circular
    backgroundColor: '#007bff', // Button color (blue)
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
    elevation: 5,  // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
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
