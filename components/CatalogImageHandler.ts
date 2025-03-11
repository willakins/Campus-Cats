import React, { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { deleteObject, uploadBytesResumable, ref } from 'firebase/storage';
import { storage } from '@/config/firebase';

type FetchCatImagesType = (
  catName: string,
  setProfile: Dispatch<SetStateAction<string>>,
  setImageUrls: Dispatch<SetStateAction<string[]>>
) => Promise<void>;

interface CatalogImageHandlerProps {
  setVisible: (visible: boolean) => void;
  fetchCatImages: FetchCatImagesType;
  setImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setNewPics: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  setNewPhotos: React.Dispatch<React.SetStateAction<boolean>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  name: string; // Assuming the cat's name is passed to the handler
  profilePicName?: string;
  profilePicUrl?: string;
}

class CatalogImageHandler {
  private setVisible: (visible: boolean) => void;
  private fetchCatImages: FetchCatImagesType;
  private setImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  private setNewPics: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  private setNewPhotos: React.Dispatch<React.SetStateAction<boolean>>;
  private setProfile: React.Dispatch<React.SetStateAction<string>>;
  private name: string;
  private profilePicName?: string;
  private profilePicUrl?: string;

  constructor({
    setVisible,
    fetchCatImages,
    setImageUrls,
    setNewPics,
    setNewPhotos,
    setProfile,
    name,
    profilePicUrl
  }: CatalogImageHandlerProps) {
    this.setVisible = setVisible;
    this.fetchCatImages = fetchCatImages;
    this.setImageUrls = setImageUrls;
    this.setNewPics = setNewPics;
    this.setNewPhotos = setNewPhotos;
    this.setProfile = setProfile;
    this.name = name;
    this.profilePicName = name + '_profile.jpg';
    this.profilePicUrl = profilePicUrl;
  }

  public swapProfilePicture = async (picUrl:string) => {
    this.setVisible(true);
    const picName = this.getFileNameFromUrl(picUrl);
    try {
      if (!this.profilePicName || !picName) {
        alert('Error Could not find profile picture or selected picture.');
        return;
      }

      const oldProfileRef = ref(storage, `cats/${this.name}/${this.profilePicName}`);
      const selectedPicRef = ref(storage, `cats/${this.name}/${picName}`);

      // Fetch image blobs
      const oldProfileBlob = await (await fetch(this.profilePicUrl!)).blob();
      const selectedPicBlob = await (await fetch(picUrl)).blob();

      // Swap images:
      // 1. Delete both files
      await deleteObject(oldProfileRef);
      await deleteObject(selectedPicRef);

      // 2. Re-upload old profile picture as selectedPic.name
      const newExtraPicRef = ref(storage, `cats/${this.name}/${picName}`);
      await uploadBytesResumable(newExtraPicRef, oldProfileBlob);

      // 3. Re-upload selected picture as profile picture
      const newProfilePicRef = ref(storage, `cats/${this.name}/${this.name}_profile.jpg`);
      await uploadBytesResumable(newProfilePicRef, selectedPicBlob);

      // Refresh UI
      this.fetchCatImages(this.name, this.setProfile, this.setImageUrls);
      alert('Success Profile picture updated!');
    } catch (error) {
      console.error('Error swapping profile picture:', error);
      alert('Error Failed to swap profile picture.');
    } finally {
      this.setVisible(false);
    }
  };

  public confirmDeletion = (photoURL: string) => {
    Alert.alert(
      'Select Option',
      'Are you sure you want to delete this image forever?',
      [
        {
          text: 'Delete Forever',
          onPress: () => this.deletePicture(photoURL),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  private deletePicture = async (photoURL: string) => {
    try {
      const imageRef = ref(storage, `cats/${this.name}/${photoURL}`);
      await deleteObject(imageRef);
      this.fetchCatImages(this.name, this.setProfile, this.setImageUrls);

      alert('Success Image deleted successfully!');
    } catch (error) {
      alert('Error Failed to delete the image.');
      console.error('Error deleting image: ', error);
    }
  };

  public addPhoto = (newPhotoUri: string) => {
    console.log('adding photos!')
    this.setImageUrls((prevPics) => [
      ...prevPics,
      newPhotoUri,
    ]);
    this.setNewPics((prevPics) => [
      ...prevPics,
      { url: newPhotoUri, name: `photo_${prevPics.length + 1}` },
    ]);
    this.setNewPhotos(true);
  };

  private getFileNameFromUrl(url: string): string {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname; // Get the path part of the URL
    const fileName = path.substring(path.lastIndexOf('/') + 1); // Get the part after the last '/'
    return fileName;
  }
}
export { CatalogImageHandler };