import * as ImagePicker from 'expo-image-picker';

import { ImageSelectionPort, SelectedImage } from '../../core/ports';

export class ExpoImageSelection implements ImageSelectionPort {
  async pickFromLibrary(): Promise<SelectedImage | undefined> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Media library permission was denied');
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    return selectedImage(result);
  }

  async takePhoto(): Promise<SelectedImage | undefined> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      throw new Error('Camera permission was denied');
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    return selectedImage(result);
  }
}

function selectedImage(
  result: ImagePicker.ImagePickerResult,
): SelectedImage | undefined {
  return result.canceled || !result.assets[0]
    ? undefined
    : { localUri: result.assets[0].uri };
}
