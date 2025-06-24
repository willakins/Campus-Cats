import { Alert } from 'react-native';

import DatabaseService from '../services/DatabaseService';
import BaseImageHandler from './BaseImageHandler';

interface CatalogImageHandlerProps {
  type: string;
  id: string;
  photos?: string[];
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  setPicsChanged: React.Dispatch<React.SetStateAction<boolean>>;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

class CatalogImageHandler extends BaseImageHandler {
  private type;
  private id;
  private photos?;
  private profile?;
  private setPhotos;
  private setProfile;
  private setPicsChanged;
  private setVisible;

  private database = DatabaseService.getInstance();

  constructor({
    type,
    id,
    photos,
    profile,
    setPhotos,
    setProfile,
    setPicsChanged,
    setVisible,
  }: CatalogImageHandlerProps) {
    super();
    this.type = type;
    this.id = id;
    this.photos = photos;
    this.profile = profile;
    this.setProfile = setProfile;
    this.setPhotos = setPhotos;
    this.setPicsChanged = setPicsChanged;
    this.setVisible = setVisible;
  }

  protected onPhotoSelected(uri: string): void {
    this.setPhotos((prev) => [...prev, uri]);
    this.setPicsChanged(true);
  }

  public swapProfilePicture = async (picUrl: string) => {
    const picName = this.getFileNameFromUrl(picUrl);
    try {
      this.setVisible(true);
      if (!picName) {
        alert('Error: Invalid picture filename.');
        return;
      }
      await this.database.swapProfilePicture(
        this.type,
        this.id,
        picUrl,
        picName,
        this.profile,
      );
      if (this.type === 'catalog') {
        this.database.fetchCatImages(this.id, this.setProfile, this.setPhotos);
      } else if (this.type === 'sightings') {
        this.database.fetchSightingImages(
          this.id,
          this.setProfile,
          this.setPhotos,
        );
      } else if (this.type === 'stations') {
        this.database.fetchStationImages(
          this.id,
          this.setProfile,
          this.setPhotos,
        );
      }
    } catch (error) {
      console.error('Swap error:', error);
      alert('Failed to swap profile picture.');
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
          onPress: async () => {
            if (this.type === 'catalog') {
              await this.database.deleteCatalogPicture(this.id, picName);
              this.database.fetchCatImages(
                this.id,
                this.setProfile,
                this.setPhotos,
              );
            } else if (this.type === 'sightings') {
              await this.database.deleteSightingPicture(this.id, picName);
              this.database.fetchSightingImages(
                this.id,
                this.setProfile,
                this.setPhotos,
              );
            } else if (this.type === 'stations') {
              await this.database.deleteStationPicture(this.id, picName);
              this.database.fetchStationImages(
                this.id,
                this.setProfile,
                this.setPhotos,
              );
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  };

  private getFileNameFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      const fileName = path.substring(path.lastIndexOf('/') + 1);
      const parts = fileName.split('%');
      return parts[parts.length - 1].substring(2);
    } catch {
      return '';
    }
  }
}

export { CatalogImageHandler };
