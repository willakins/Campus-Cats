import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import { Camera, CameraType } from 'expo-camera';

export default function Picture() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraRef, setCameraRef] = useState<typeof Camera | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);

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
        if (cameraRef) {
          const photoData = await cameraRef.takePictureAsync();
          setPhoto(photoData.uri); // Save the photo URI
        }
    };
    return (
        <View style={styles.container}>
            <Camera style={styles.camera} ref={(ref) => setCameraRef(ref)}>
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