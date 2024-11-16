import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Image, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, db } from "./firebase";  // Your firebase.js file

export default function Picture() {
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
        const uri = photo.uri;
        const filename = uri.substring(uri.lastIndexOf("/") + 1);
        const storageRef = ref(storage, `photos/${filename}`);
        const response = await fetch(uri);
        const blob = await response.blob();

        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on(
          "state_changed",
          null,
          (error) => {
            console.error("Error uploading photo: ", error);
          },
          () => {
            // Get download URL after upload is complete
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              setPhotoUrl(downloadURL); // Store URL in state
              console.log("File available at: ", downloadURL);
              // You can save the download URL in Firestore if needed
            });
          }
        );
        // Alert success and navigate
        Alert.alert('Success', 'Photo saved successfully!');
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