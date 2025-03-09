import React from 'react';
import { Alert } from 'react-native';
import { deleteObject, uploadBytesResumable, ref } from 'firebase/storage';
import { storage } from '@/services/firebase';

interface CatalogImageHandlerProps {
  setVisible: (visible: boolean) => void;
  fetchCatImages: () => void;
  setExtraPics: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  setNewPics: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  setNewPhotos: React.Dispatch<React.SetStateAction<boolean>>;
  name: string; // Assuming the cat's name is passed to the handler
  profilePicName?: string;
  profilePicUrl?: string;
}

class CatalogImageHandler {
  private setVisible: (visible: boolean) => void;
  private fetchCatImages: () => void;
  private setExtraPics: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  private setNewPics: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  private setNewPhotos: React.Dispatch<React.SetStateAction<boolean>>;
  private name: string;
  private profilePicName?: string;
  private profilePicUrl?: string;

  constructor({
    setVisible,
    fetchCatImages,
    setExtraPics,
    setNewPics,
    setNewPhotos,
    name,
    profilePicUrl
  }: CatalogImageHandlerProps) {
    this.setVisible = setVisible;
    this.fetchCatImages = fetchCatImages;
    this.setExtraPics = setExtraPics;
    this.setNewPics = setNewPics;
    this.setNewPhotos = setNewPhotos;
    this.name = name;
    this.profilePicName = name + '_profile.jpg';
    this.profilePicUrl = profilePicUrl;
  }

  public swapProfilePicture = async (selectedPic: { name: string, url: string }) => {
    this.setVisible(true);
    try {
      if (!this.profilePicName || !selectedPic.name) {
        alert('Error Could not find profile picture or selected picture.');
        return;
      }

      const oldProfileRef = ref(storage, `cats/${this.name}/${this.profilePicName}`);
      const selectedPicRef = ref(storage, `cats/${this.name}/${selectedPic.name}`);

      // Fetch image blobs
      const oldProfileBlob = await (await fetch(this.profilePicUrl!)).blob();
      const selectedPicBlob = await (await fetch(selectedPic.url)).blob();

      // Swap images:
      // 1. Delete both files
      await deleteObject(oldProfileRef);
      await deleteObject(selectedPicRef);

      // 2. Re-upload old profile picture as selectedPic.name
      const newExtraPicRef = ref(storage, `cats/${this.name}/${selectedPic.name}`);
      await uploadBytesResumable(newExtraPicRef, oldProfileBlob);

      // 3. Re-upload selected picture as profile picture
      const newProfilePicRef = ref(storage, `cats/${this.name}/${this.name}_profile.jpg`);
      await uploadBytesResumable(newProfilePicRef, selectedPicBlob);

      // Refresh UI
      this.fetchCatImages();
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
      this.fetchCatImages();

      alert('Success Image deleted successfully!');
    } catch (error) {
      alert('Error Failed to delete the image.');
      console.error('Error deleting image: ', error);
    }
  };

  public addPhoto = (newPhotoUri: string) => {
    console.log('adding photos!')
    this.setExtraPics((prevPics) => [
      ...prevPics,
      { url: newPhotoUri, name: `photo_${prevPics.length + 1}` },
    ]);
    this.setNewPics((prevPics) => [
      ...prevPics,
      { url: newPhotoUri, name: `photo_${prevPics.length + 1}` },
    ]);
    this.setNewPhotos(true);
  };
}

export { CatalogImageHandler };
