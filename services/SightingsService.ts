import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';

import { Router } from 'expo-router';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
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
import { getSelectedSighting } from '@/stores/sightingStores';
import { Sighting } from '@/types';

//Wrapper class for sightings database funcitonality
class SightingsService {
  /**
   * Effect: Pulls cat sightings from firestore and stores them in Marker friendly format
   */
  public async fetchPins(
    setPins: Dispatch<SetStateAction<Sighting[]>>,
    setMapKey: Dispatch<SetStateAction<number>>,
  ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'cat-sightings'));

      // First gather all raw sightings
      const pins: Sighting[] = querySnapshot.docs.map((document) => ({
        id: document.id,
        date: document.data().spotted_time.toDate(),
        fed: document.data().fed,
        health: document.data().health,
        info: document.data().info,
        location: document.data().location,
        name: document.data().name,
        createdBy: document.data().createdBy,
        timeofDay: document.data().timeofDay,
      }));

      setPins(pins);
      setMapKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error fetching map pins: ', error);
    }
  }

  /**
   * Effect: pulls sighting images from storage
   */
  public async fetchSightingImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setPhotos?: Dispatch<SetStateAction<string[]>>,
  ) {
    try {
      const folderRef = ref(storage, `cat-sightings/${id}`);
      const result = await listAll(folderRef);

      // Fetch all download URLs
      const urls = await Promise.all(
        result.items.map((item) => getDownloadURL(item)),
      );

      // Separate the profile image and other images
      const profileImage = urls.find((url, index) => {
        // Check if the file name contains 'profile'
        return result.items[index].name.toLowerCase().includes('profile');
      });

      // If a profile image is found, set it
      if (profileImage) {
        setProfile(profileImage);
      }

      // Filter out the profile image and set the rest as photos
      const otherImages = urls.filter((url, index) => {
        // Check if the file name does NOT contain 'profile'
        return !result.items[index].name.toLowerCase().includes('profile');
      });

      // Set the photos
      if (setPhotos) {
        setPhotos(otherImages);
      }
    } catch (error) {
      console.error('Error fetching image URLs:', error);
    }
  }

  /**
   * Effect: pulls sightings for one specific cat from firestore
   */
  public async getSightings(
    name: string,
    setSightings: Dispatch<SetStateAction<Sighting[]>>,
  ) {
    try {
      const sightingsRef = collection(db, 'cat-sightings');
      const q = query(sightingsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);

      const sightings: Sighting[] = querySnapshot.docs.map((document) => ({
        id: document.id,
        date: document.data().spotted_time.toDate(),
        fed: document.data().fed,
        health: document.data().health,
        info: document.data().info,
        location: document.data().location,
        name: document.data().name,
        createdBy: document.data().createdBy,
        timeofDay: document.data().timeofDay,
      }));

      setSightings(sightings);
    } catch (error) {
      console.error('Error fetching cat sightings: ', error);
    }
  }

  /**
   * Effect: Submits a new cat sighting to firestore
   */
  public async createSighting(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const sighting = getSelectedSighting();
      const error_message = this.validateInput(sighting, photos);

      if (error_message === '') {
        const docRef = await addDoc(collection(db, 'cat-sightings'), {
          createdAt: serverTimestamp(),
          createdBy: sighting.createdBy,
          spotted_time: Timestamp.fromDate(sighting.date),
          location: sighting.location,
          name: sighting.name,
          info: sighting.info,
          health: sighting.health,
          fed: sighting.fed,
          timeofDay: sighting.timeofDay,
        });
        const profilePhoto = photos[0];
        await this.uploadImageToStorage(
          profilePhoto,
          `cat-sightings/${docRef.id}/profile.jpg`,
        );

        const otherPhotos = photos.slice(1);
        await this.uploadImagesToStorage(
          otherPhotos,
          `cat-sightings/${docRef.id}`,
        );

        alert('Cat submitted successfully!');
        router.navigate('/(app)/(tabs)');
      } else {
        alert(error_message);
      }
    } catch (error) {
      alert(error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: updates firestore when deleting a cat sighting
   */
  public async deleteSighting(
    id: string,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    Alert.alert(
      'Select Option',
      'Are you sure you want to delete this sighting forever?',
      [
        {
          text: 'Delete Forever',
          onPress: async () =>
            this.confirmDeleteSighting(id, setVisible, router),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }

  private async confirmDeleteSighting(
    id: string,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const photoPath = `cat-sightings/${id}`;
      const folderRef = ref(storage, photoPath);
      const result = await listAll(folderRef);
      await Promise.all(result.items.map((item) => deleteObject(item)));
      await deleteDoc(doc(db, 'cat-sightings', id));
      router.push('/(app)/(tabs)');
      alert('Cat sighting deleted successfully!');
    } catch (error) {
      alert('Failed to delete sighting.' + error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: updates firestore when editing a cat sighting
   */
  public async saveSighting(
    photos: string[],
    profile: string,
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const sighting = getSelectedSighting();
      const error_message = this.validateInput(sighting, [profile]);
      if (error_message === '') {
        const stamp = Timestamp.fromDate(new Date(sighting.date));
        const sightingRef = doc(db, 'cat-sightings', sighting.id);
        await updateDoc(sightingRef, {
          spotted_time: stamp,
          timestamp: serverTimestamp(),
          fed: sighting.fed,
          health: sighting.health,
          info: sighting.info,
          location: sighting.location,
          name: sighting.name,
          createdBy: sighting.createdBy,
          timeofDay: sighting.timeofDay,
        });
        if (isPicsChanged) {
          // Fetch existing images from Firebase Storage
          const existingImages = await this.fetchExistingImagesFromStorage(
            `cat-sightings/${sighting.id}`,
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
              `cat-sightings/${sighting.id}`,
            );
          }
        }
        router.push('/(app)/sighting/view-sighting');
      } else {
        alert(error_message);
      }
    } catch (error) {
      alert(error);
    } finally {
      setVisible(false);
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
    const folderRef = ref(storage, `cat-sightings/${id}`);
    const listResult = await listAll(folderRef);

    // Find the profile picture regardless of extension
    const profileFile = listResult.items.find((item) => {
      const name = item.name.toLowerCase();
      return name.startsWith('profile.') || name === 'profile';
    });

    const selectedPicRef = ref(storage, `cat-sightings/${id}/${picName}`);

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
    const newExtraPicRef = ref(storage, `cat-sightings/${id}/${picName}`);
    await uploadBytesResumable(newExtraPicRef, oldProfileBlob);

    // 3. Re-upload selected picture as profile picture
    const newProfilePicRef = ref(storage, `cat-sightings/${id}/profile.jpg`);
    await uploadBytesResumable(newProfilePicRef, selectedPicBlob);
  }

  /**
   * Effect: deletes a picture from a catalog entry
   */
  public async deleteSightingPicture(id: string, picName: string) {
    try {
      const imageRef = ref(storage, `cat-sightings/${id}/${picName}`);
      await deleteObject(imageRef);
      alert('Success Image deleted successfully!');
    } catch (error) {
      alert('Error Failed to delete the image.');
      console.error('Error deleting image: ', error);
    }
  }

  /**
   * Private 2
   */
  private validateInput(sighting: Sighting, photos: string[]) {
    if (sighting.name === '') {
      return 'Please enter a name for the cat.';
    } else if (
      isNaN(sighting.location.longitude) ||
      sighting.location.longitude === 0 ||
      isNaN(sighting.location.latitude) ||
      sighting.location.latitude === 0
    ) {
      return 'Please Select a location on the map';
    } else if (!sighting.timeofDay) {
      return 'Please select a time of day for the sighting.';
    } else if (photos.length === 0) {
      return 'Please select a photo.';
    }
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
export default SightingsService;
