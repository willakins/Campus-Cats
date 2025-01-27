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
        {/* Top Left: Flip Camera Button */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={toggleCameraFacing} style={styles.flipButton}>
            <Ionicons name="camera-reverse" size={32} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom Center: Shutter Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.innerCircle} />
          </TouchableOpacity>
        </View>
      </CameraView>

      {/* Display the Captured Photo */}
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
        type: '*/*', // Allow all file types
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
