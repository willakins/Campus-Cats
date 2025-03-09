import * as ImagePicker from 'expo-image-picker';
import { PermissionResponse } from 'expo-modules-core';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import 'react-native-get-random-values'; // Needed for uuid
import { v4 as uuidv4 } from 'uuid';

import { storage } from '@/config/firebase';

type PickerOptionType = ImagePicker.ImagePickerOptions;
type PickerResultType = ImagePicker.ImagePickerResult;
type PickerFunctionType = (options?: PickerOptionType) => Promise<PickerResultType>;

// Use a file picker
export const getMediaFromPicker = async ({
  requestPermissions,
  pickMedia,
  pickMediaOptions,
  permissionsErrorMessage = 'Sorry, we need permissions to make this work!',
}: {
  requestPermissions: () => Promise<PermissionResponse>;
  pickMedia: PickerFunctionType;
  pickMediaOptions?: PickerOptionType;
  permissionsErrorMessage: string;
}): Promise<ImagePicker.ImagePickerAsset[] | null> => {
  const { status } = await requestPermissions();
  if (status !== 'granted') {
    alert(permissionsErrorMessage);
  }

  const result = await pickMedia(pickMediaOptions);
  return !result.canceled ? result.assets : null;
};

// Upload a file
export const uploadFromURI = async (uploadDir: string, uri: string) => {
  // Get a unique ref
  const filename = uuidv4();
  const filepath = uploadDir + filename;
  const storageRef = ref(storage, filepath);

  // Get a file for uploading
  // https://stackoverflow.com/questions/48108791/convert-image-path-to-blob-react-native
  const response = await fetch(uri);
  const file = await response.blob();

  // Upload the file to the ref
  const result = await uploadBytes(storageRef, file);
  return result;
};

// Get the download URL of a storage path
export const getStorageURL = async (path: string) => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};
