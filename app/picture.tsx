import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import { Camera } from 'expo-camera';  // Correct import

export default function Picture() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  
  // Create a ref for the camera component
  const cameraRef = useRef<Camera | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photoData = await cameraRef.current.takePictureAsync();
      setPhoto(photoData.uri); // Save the photo URI
    }
  };

  return (
    <View style={styles.container}>
      {/* Correct use of Camera with ref */}
      <Camera style={styles.camera} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <Button title="Take Picture" onPress={takePicture} />
        </View>
      </Camera>

      {photo && (
        <Image source={{ uri: photo }} style={styles.preview} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: 400,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 20,
  },
});
