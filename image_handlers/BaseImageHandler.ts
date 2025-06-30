import { Alert } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

abstract class BaseImageHandler {
  protected async requestPermission(
    requestFn: () => Promise<{ status: string }>,
    type: string,
  ): Promise<boolean> {
    const { status } = await requestFn();
    if (status !== 'granted') {
      alert(`Sorry, we need ${type} permissions to make this work!`);
      return false;
    }
    return true;
  }

  protected async pickImage(
    fromCamera: boolean = false,
  ): Promise<string | null> {
    const permissionGranted = fromCamera
      ? await this.requestPermission(
          ImagePicker.requestCameraPermissionsAsync,
          'camera',
        )
      : await this.requestPermission(
          ImagePicker.requestMediaLibraryPermissionsAsync,
          'media library',
        );

    if (!permissionGranted) return null;

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 1.0 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 1.0 });

    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  }

  public promptForImageSource(): void {
    Alert.alert(
      'Select Option',
      'Would you like to take a photo or select from your library?',
      [
        {
          text: 'Take Photo',
          onPress: () => this.onSelectPhoto(true),
        },
        {
          text: 'Choose from Library',
          onPress: () => this.onSelectPhoto(false),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }

  protected async onSelectPhoto(fromCamera: boolean) {
    const uri = await this.pickImage(fromCamera);
    if (uri) {
      this.onPhotoSelected(uri);
    }
  }

  protected abstract onPhotoSelected(uri: string): void;
}

export default BaseImageHandler;
