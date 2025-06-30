import 'react-native-get-random-values';

import {
  UploadResult,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
// get-random-values needed for uuid
import { v4 as uuidv4 } from 'uuid';

import { storage } from '@/config/firebase';

// Upload a file
export const uploadFromURI = async (
  uploadDir: string,
  uri: string,
  filename?: string,
): Promise<UploadResult> => {
  // Get a unique ref
  const filename_ = filename || uuidv4();
  const filepath = uploadDir + filename_;
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
  return getDownloadURL(storageRef);
};
