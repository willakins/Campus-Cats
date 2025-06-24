import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';

import { Router } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  uploadBytesResumable,
} from 'firebase/storage';

import { db, storage } from '@/config/firebase';
import { getSelectedStation } from '@/stores/stationStores';
import { Station } from '@/types';

//Wrapper class for stations database funcitonality
class StationsService {
  /**
   * Effect: Pulls a list of stations from firestore
   */
  public async fetchStations(
    setStationEntries: Dispatch<SetStateAction<Station[]>>,
  ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'stations'));
      const stations: Station[] = querySnapshot.docs.map((document) => ({
        id: document.id,
        name: document.data().name,
        location: document.data().location,
        lastStocked: document.data().lastStocked.toDate(),
        stockingFreq: document.data().stockingFreq,
        knownCats: document.data().knownCats,
        isStocked: Station.calculateStocked(
          document.data().lastStocked.toDate(),
          document.data().stockingFreq,
        ),
        createdBy: document.data().createdBy,
      }));
      setStationEntries(stations);
    } catch (error) {
      console.error('Error fetching sations data: ', error);
    }
  }

  /**
   * Effect: Pulls images from firestore storage, sets profile picture
   */
  public async fetchStationImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setPhotos: Dispatch<SetStateAction<string[]>>,
  ) {
    try {
      const folderRef = ref(storage, `stations/${id}`);
      const result = await listAll(folderRef);

      // Fetch all download URLs
      const urls = await Promise.all(
        result.items.map((item) => getDownloadURL(item)),
      );

      // Separate the profile image and other images
      const profileImage = urls.find((_url, index) => {
        // Check if the file name contains 'profile'
        return result.items[index].name.toLowerCase().includes('profile');
      });

      // If a profile image is found, set it
      if (profileImage) {
        setProfile(profileImage);
      }

      // Filter out the profile image and set the rest as photos
      const otherImages = urls.filter((_url, index) => {
        // Check if the file name does NOT contain 'profile'
        return !result.items[index].name.toLowerCase().includes('profile');
      });

      // Set the photos
      setPhotos(otherImages);
    } catch (error) {
      console.error('Error fetching image URLs:', error);
    }
  }

  /**
   * Effect: Creates a firestore document inside of the 'stations' collection
   */
  public async createStation(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const station = getSelectedStation();
      const error_message = this.validateInput(station, photos);
      if (error_message === '') {
        const stationCollectionRef = collection(db, 'stations');
        const docRef = await addDoc(stationCollectionRef, {
          name: station.name,
          location: station.location,
          lastStocked: station.lastStocked,
          stockingFreq: station.stockingFreq,
          knownCats: station.knownCats,
          createdBy: station.createdBy,
        });

        const profilePhoto = photos[0];
        await this.uploadImageToStorage(
          profilePhoto,
          `stations/${docRef.id}/profile.jpg`,
        );

        const otherPhotos = photos.slice(1);
        await this.uploadImagesToStorage(otherPhotos, `stations/${docRef.id}`);

        router.navigate('/stations');
      } else {
        alert(error_message);
      }
    } catch (error) {
      console.error('Error adding document: ', error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: saves the station to the firestore database
   */
  public async saveStation(
    profile: string,
    photos: string[],
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const station = getSelectedStation();
      const error_message = this.validateInput(station, [profile]);
      if (error_message === '') {
        // Reference to the Firestore document using its ID
        const stationDocRef = doc(db, 'stations', station.id);
        await updateDoc(stationDocRef, {
          name: station.name,
          location: station.location,
          lastStocked: station.lastStocked,
          stockingFreq: station.stockingFreq,
          knownCats: station.knownCats,
          createdBy: station.createdBy,
        });
        if (isPicsChanged) {
          // Fetch existing images from Firebase Storage
          const existingImages = await this.fetchExistingImagesFromStorage(
            `stations/${station.id}`,
          );
          photos = [...photos, profile];
          // 3. Compare new photos with existing ones
          const newImages = photos.filter(
            (photo) => !existingImages.includes(photo),
          ); // Only new images
          const imagesToDelete = existingImages.filter(
            (image: string) => !photos.includes(image),
          ); // Images to remove

          // 4. Delete images that are no longer in the new list (optional)
          for (const image of imagesToDelete) {
            await this.deleteImageFromStorage(image); // Delete old images from Firebase Storage
          }

          // 5. Upload new images
          if (newImages.length > 0) {
            await this.uploadImagesToStorage(
              newImages,
              `stations/${station.id}`,
            );
          }
        }
      } else {
        alert(error_message);
      }
    } catch (error) {
      console.error('Error updating station:', error);
      alert('Error Failed to update station.');
    } finally {
      setVisible(false);
      router.navigate('/stations');
    }
  }

  /**
   * Deletes the station from the database
   */
  public async deleteStation(
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    Alert.alert(
      'Select Option',
      'Are you sure you want to delete this image forever?',
      [
        {
          text: 'Delete Forever',
          onPress: async () =>
            this.confirmDeleteStationEntry(setVisible, router),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }

  /**
   * Effect: Stocks a station
   */
  public async stockStation(
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const station = getSelectedStation();

      station.lastStocked = new Date();
      const stationDocRef = doc(db, 'stations', station.id);
      await updateDoc(stationDocRef, {
        name: station.name,
        location: station.location,
        lastStocked: station.lastStocked,
        stockingFreq: station.stockingFreq,
        knownCats: station.knownCats,
        createdBy: station.createdBy,
      });
    } catch (error) {
      Alert.alert(error as string);
    } finally {
      setVisible(false);
      setTimeout(() => {
        router.back();
      }, 500);
    }
  }

  /**
   * Effect: deletes a picture from a catalog entry
   */
  public async deleteSightingPicture(id: string, picName: string) {
    try {
      const imageRef = ref(storage, `stations/${id}/${picName}`);
      await deleteObject(imageRef);
      alert('Success Image deleted successfully!');
    } catch (error) {
      alert('Error Failed to delete the image.');
      console.error('Error deleting image: ', error);
    }
  }

  /**
   * Effect: Swaps the profile picture for a catalog entry
   */
  public async swapProfilePicture(
    id: string,
    picUrl: string,
    picName: string,
    profilePicUrl?: string,
  ) {
    const folderRef = ref(storage, `stations/${id}`);
    const listResult = await listAll(folderRef);

    // Find the profile picture regardless of extension
    const profileFile = listResult.items.find((item) => {
      const name = item.name.toLowerCase();
      return name.startsWith('profile.') || name === 'profile';
    });

    const selectedPicRef = ref(storage, `stations/${id}/${picName}`);

    // Fetch image blobs
    const oldProfileBlob = await (await fetch(profilePicUrl ?? '')).blob();
    const selectedPicBlob = await (await fetch(picUrl)).blob();

    // Swap images:
    // 1. Delete both files
    if (profileFile) {
      await deleteObject(profileFile);
    }
    await deleteObject(selectedPicRef);

    // 2. Re-upload old profile picture as selectedPic.name
    const newExtraPicRef = ref(storage, `stations/${id}/${picName}`);
    await uploadBytesResumable(newExtraPicRef, oldProfileBlob);

    // 3. Re-upload selected picture as profile picture
    const newProfilePicRef = ref(storage, `stations/${id}/profile.jpg`);
    await uploadBytesResumable(newProfilePicRef, selectedPicBlob);
  }

  /**
   * Private 1
   */
  private async confirmDeleteStationEntry(
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const station = getSelectedStation();
      const photoPath = `stations/${station.id}`;
      const folderRef = ref(storage, photoPath);
      const result = await listAll(folderRef);
      await Promise.all(result.items.map((item) => deleteObject(item)));
      await deleteDoc(doc(db, 'stations', station.id));
      alert('Station deleted successfully!');
    } catch (error) {
      alert(error);
    } finally {
      setVisible(false);
      router.navigate('/stations');
    }
  }

  /**
   * Private 2
   */
  private validateInput(station: Station, photos: string[]): string {
    // Validate required string fields
    if (
      !station.name ||
      typeof station.name !== 'string' ||
      station.name.trim().length === 0
    ) {
      return 'Name field must not be empty';
    } else if (
      !(station.lastStocked instanceof Date) ||
      isNaN(station.lastStocked.getTime())
    ) {
      return 'Last Stocked date is invalid';
    } else if (photos.length === 0) {
      return 'Please select a photo.';
    }

    // Validate location coordinates
    const { latitude, longitude } = station.location;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude === 0 ||
      longitude === 0
    ) {
      return 'Please select a location on the map';
    }

    // Validate stockingFreq is a positive number
    if (typeof station.stockingFreq !== 'number' || station.stockingFreq <= 0) {
      return 'Stocking Frequency must be a positive number';
    }

    // If everything is valid
    return '';
  }

  // Helper method to delete an image from Firebase Storage
  private async deleteImageFromStorage(imageUrl: string): Promise<void> {
    try {
      const imageRef = ref(storage, imageUrl); // Reference to the image in Firebase Storage
      await deleteObject(imageRef); // Delete the image from Firebase Storage
      console.log(`Image ${imageUrl} deleted from storage.`);
    } catch (error) {
      console.error('Error deleting image from storage: ', error);
    }
  }

  // Helper function to upload a single image (used for profile picture)
  private async uploadImageToStorage(photoUri: string, filePath: string) {
    const storageRef = ref(storage, filePath);
    const response = await fetch(photoUri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
  }

  // Helper method to upload images to Firebase Storage
  private async uploadImagesToStorage(
    images: string[],
    folderPath: string,
  ): Promise<void> {
    try {
      for (const imageUri of images) {
        const uniqueFilename = this.generateUniqueFileName([], '');
        const imageRef = ref(storage, `${folderPath}/${uniqueFilename}`); // Create a unique ref based on timestamp
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytesResumable(imageRef, blob); // Upload image to Firebase Storage
        console.log(`Image ${imageUri} uploaded to ${imageRef.fullPath}`);
      }
    } catch (error) {
      console.error('Error uploading images to storage: ', error);
    }
  }

  // Helper method to fetch existing images URLs from Firebase Storage folder
  private async fetchExistingImagesFromStorage(
    folderPath: string,
  ): Promise<string[]> {
    try {
      const folderRef = ref(storage, folderPath);
      const listResult = await listAll(folderRef); // List all files in the folder
      const existingImageUrls = await Promise.all(
        listResult.items.map(async (itemRef) => {
          const downloadURL = await getDownloadURL(itemRef); // Get the download URL for each file
          return downloadURL;
        }),
      );
      return existingImageUrls;
    } catch (error) {
      console.error('Error fetching existing images: ', error);
      return [];
    }
  }

  /**
   * Private 4
   */
  private generateUniqueFileName(
    existingFiles: string[],
    originalName: string,
  ) {
    const fileNameBase = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
    let newFileName: string;

    do {
      const randomInt = Math.floor(Math.random() * 1000000000); // Generate random number (0-9999)
      newFileName = `${fileNameBase}_${randomInt}.jpg`;
    } while (existingFiles.includes(newFileName)); // Ensure it's unique

    return newFileName;
  }
}
export default StationsService;
