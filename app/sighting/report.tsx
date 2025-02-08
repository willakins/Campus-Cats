import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, Switch, Button, ActivityIndicator, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db, storage } from "../logged-in/firebase";
import { Asset, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Ionicons } from "@expo/vector-icons";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const CatReportScreen = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [health, setHealth] = useState(false);
  const [fed, setFed] = useState(false);
  const [photo, setPhoto] = useState<Asset | null>(null);
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
        } else if(response.assets && response.assets[0]){
          setPhoto(response.assets[0]);
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
  const handleSubmission = async () => {
    if (photo && photo.uri) {
      alert("Cat submitted!")
      // Upload the image to Firebase Storage
      const photoRef = ref(storage, 'cat_photos/' + photo.fileName);
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      await uploadBytes(photoRef, blob);

      // Store the photo URL and other data in Firestore
      const photoURL = await getDownloadURL(photoRef);
      await addDoc(collection(db, 'cat_sightings'), {
        name,
        info,
        health,
        fed,
        photoURL,
        createdAt: new Date(),
      });
    } else {
      alert('Please select a photo.');
    }
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
            <View style={styles.cameraView}>
              <TouchableOpacity style={styles.cameraButton} onPress={handlePress}>
                <Ionicons name="camera-outline" size={29} color={'#fff'} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={handleSubmission}>
              <Text style = {styles.buttonText}>Submit Sighting</Text>
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
  
});
 /** Old code for picture.tsx removed to improve navigation
import React, { useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, db } from "./firebase";  // Your firebase.js file
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

const Stack = createStackNavigator();

export const uploadFileToFirebase = async (fileUri: string, folder = 'photos') => {
  try {
    const filename = fileUri.substring(fileUri.lastIndexOf('/') + 1);
    const storageRef = ref(storage, `${folder}/${filename}`);
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Error uploading file:', error);
          Alert.alert('Upload Error', 'An error occurred while uploading the file.');
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('File available at:', downloadURL);
          resolve(downloadURL); // Return the download URL
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadFileToFirebase:', error);
    Alert.alert('Upload Error', 'Failed to upload the file.');
    throw error;
  }
};

const SelectScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Button title="Take a picture" onPress={() => navigation.navigate('camera')} />
      <Button title="Upload a file" onPress={() => navigation.navigate('upload')} />
    </View>
  );
};

const CameraScreen: React.FC = () => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const takePicture = async () => {
    if(cameraRef.current) {
      try{
        const photo = await cameraRef.current.takePictureAsync();

        // Check if photo is undefined or null
        if (!photo?.uri) {
          Alert.alert('Error', 'Failed to capture photo.');
          return;
        }

        // Upload photo to Firebase Storage
        const downloadURL = await uploadFileToFirebase(photo.uri);
        Alert.alert('Success', 'Photo uploaded successfully!');
        console.log('Photo available at:', downloadURL);

        router.push('/after-picture/picture-taken');
      } catch (error) {
        console.error("Error taking picture:", error);
      }
    }
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }}>
        {Top Left: Flip Camera Button}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipButton}>
            <Ionicons name="camera-reverse" size={32} color="white" />
          </TouchableOpacity>
        </View>

        { Bottom Center: Shutter Button}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.innerCircle} />
          </TouchableOpacity>
        </View>
      </CameraView>

      {Display the Captured Photo}
      {photoUri && (
        <View style={styles.preview}>
          <Text style={styles.previewText}>Preview:</Text>
          <Image source={{ uri: photoUri }} style={styles.image} />
        </View>
      )}
    </View>
  );
}

const UploadScreen: React.FC = () => {
  const [fileInfo, setFileInfo] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFilePick = async () => {
    console.log('Starting file picker...');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '* / *', // Allow all file types
        copyToCacheDirectory: true,
      });

      console.log('Document Picker Result:', result);

      if (!result.canceled) {
        if (result.assets && result.assets.length > 0) {
          const asset = result.assets[0]; // Taking the first asset
          console.log('Picked Asset:', asset);
          setFileInfo(asset); // Store file info for display
        } else {
          console.log('No assets returned from DocumentPicker.');
        }
      } else {
        console.log('User canceled file picker.');
      }
    } catch (error) {
      console.error('Error during file pick:', error);
      Alert.alert('Error', 'Failed to pick a file.');
    }
  };

  const handleUpload = async () => {
    if (fileInfo && fileInfo.uri) {
      console.log('Starting upload for file:', fileInfo);
      setUploading(true);
      try {
        const downloadURL = await uploadFileToFirebase(fileInfo.uri);
        console.log('File uploaded successfully. URL:', downloadURL);
        Alert.alert('Success', 'File uploaded successfully!');
      } catch (error) {
        console.error('Error uploading file:', error);
        Alert.alert('Error', 'Failed to upload the file.');
      } finally {
        setUploading(false);
      }
    } else {
      console.log('No file selected for upload.');
      Alert.alert('No File', 'Please select a file first.');
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Select File" onPress={handleFilePick} />
      {fileInfo && (
        <View style={styles.fileInfo}>
          <Text>File Name: {fileInfo.name}</Text>
          <Text>Size: {fileInfo.size ? `${fileInfo.size} bytes` : 'Unknown size'}</Text>
          <Text>MIME Type: {fileInfo.mimeType || 'Unknown type'}</Text>
        </View>
      )}
      <Button title="Upload File" onPress={handleUpload} disabled={uploading} />
    </View>
  );
};

export default function Picture() {
  return ( 
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="select" component={SelectScreen} />
      <Stack.Screen name="camera" component={CameraScreen} />
        <Stack.Screen name="upload" component={UploadScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 20,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#d9d9d9',
  },
  innerCircle: {
    width: 55,
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 27.5,
  },
  preview: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 10,
  },
  previewText: {
    color: '#fff',
    marginBottom: 10,
  },
  image: {
    width: 200,
    height: 300,
    resizeMode: 'contain',
  },
});

  */