import React from 'react';
import { Alert } from 'react-native';
import DatabaseService from '../services/DatabaseService';

interface CatalogImageHandlerProps {
  setVisible: (visible: boolean) => void;
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
  private setImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  private setNewPics: React.Dispatch<React.SetStateAction<{ url: string; name: string }[]>>;
  private setNewPhotos: React.Dispatch<React.SetStateAction<boolean>>;
  private setProfile: React.Dispatch<React.SetStateAction<string>>;
  private name: string;
  private profilePicName?: string;
  private profilePicUrl?: string;
  private database = DatabaseService.getInstance();

  constructor({
    setVisible,
    setImageUrls,
    setNewPics,
    setNewPhotos,
    setProfile,
    name,
    profilePicUrl
  }: CatalogImageHandlerProps) {
    this.setVisible = setVisible;
    this.setImageUrls = setImageUrls;
    this.setNewPics = setNewPics;
    this.setNewPhotos = setNewPhotos;
    this.setProfile = setProfile;
    this.name = name;
    this.profilePicName = name + '_profile.jpg';
    this.profilePicUrl = profilePicUrl;
  }

  public swapProfilePicture = async (picUrl:string) => {
    const picName = this.getFileNameFromUrl(picUrl);
    try {
      this.setVisible(true);
      if (!this.profilePicName || !picName) {
        alert('Error Could not find profile picture or selected picture.');
        return;
      }
      await this.database.swapProfilePicture(this.name, picUrl, picName, this.profilePicUrl, this.profilePicName);
      this.database.fetchCatImages(this.name, this.setProfile, this.setImageUrls);
    } catch (error) {
      console.error('Error swapping profile picture:', error);
      alert('Error Failed to swap profile picture.');
    } finally {
      this.setVisible(false);
    }
  };

  public confirmDeletion = (photoUrl: string) => {
    const picName = this.getFileNameFromUrl(photoUrl);
    Alert.alert(
      'Select Option',
      'Are you sure you want to delete this image forever?',
      [
        {
          text: 'Delete Forever',
          onPress: async () => await this.database.deleteCatalogPicture(this.name, picName, this.setProfile, this.setImageUrls),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
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
    const parts = fileName.split('%');
    const picName = parts[parts.length - 1].substring(2);// Handles weird filepath shenanigans to get desired filepath
    return picName;
  }
}
export { CatalogImageHandler };