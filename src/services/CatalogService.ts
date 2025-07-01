// TODO: Use proper types
/* eslint @typescript-eslint/no-unsafe-argument: 0 */
/* eslint @typescript-eslint/no-unsafe-assignment: 0 */
/* eslint @typescript-eslint/no-unsafe-member-access: 0 */
/* eslint @typescript-eslint/no-unsafe-return: 0 */
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
import { getSelectedCatalogEntry } from '@/stores/CatalogEntryStores';
import { Cat, CatalogEntry } from '@/types';

//Wrapper class for catalog database funcitonality
class CatalogService {
  // Overload signatures
  public async fetchCatImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setImageUrls?: Dispatch<SetStateAction<string[]>>,
  ): Promise<void>;

  /**
   * Implementation that handles both overloads
   * Effect: Pulls images from firestore storage, sets profile picture, sets extra images if applicable
   */
  public async fetchCatImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setPhotos?: Dispatch<SetStateAction<string[]>>,
  ): Promise<void> {
    try {
      const folderRef = ref(storage, `catalog/${id}`);
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
   * Effect: Pulls catalog documents from firestore
   */
  public async fetchCatalogData(
    setCatalogEntries: Dispatch<SetStateAction<CatalogEntry[]>>,
  ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'catalog'));
      const entries: CatalogEntry[] = querySnapshot.docs.map((document) => ({
        id: document.id,
        cat: document.data().cat,
        credits: document.data().credits,
        createdAt: document.data().createdAt.toDate(),
        createdBy: document.data().createdBy,
      }));
      setCatalogEntries(entries);
    } catch (error) {
      console.error('Error fetching catalog data: ', error);
    }
  }

  /**
   * Effect: Updates firestore and storage when editing a catalog entry
   */
  public async handleCatalogSave(
    photos: string[],
    profile: string,
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      const entry = getSelectedCatalogEntry();
      const error_message = this.validateInput(entry, [profile]);
      if (error_message === '') {
        setVisible(true);
        // Reference to the Firestore document using its ID
        const catDocRef = doc(db, 'catalog', entry.id);

        // Update the 'name' field in Firestore
        await updateDoc(catDocRef, {
          cat: entry.cat,
          credits: entry.credits,
          createdAt: new Date(),
          createdBy: entry.createdBy,
        });
        if (isPicsChanged) {
          // Fetch existing images from Firebase Storage
          const existingImages = await this.fetchExistingImagesFromStorage(
            `catalog/${entry.id}`,
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
            await this.uploadImagesToStorage(newImages, `catalog/${entry.id}`);
          }
        }
        router.push('/catalog/view-entry');
      } else {
        Alert.alert(error_message);
      }
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Error Failed to update name.');
    } finally {
      setVisible(false);
    }
  }

  /**
   *
   */
  public async handleCatalogCreate(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      const entry = getSelectedCatalogEntry();
      const error_message = this.validateInput(entry, photos);
      if (error_message === '') {
        setVisible(true);
        const docRef = await addDoc(collection(db, 'catalog'), {
          cat: entry.cat,
          credits: entry.credits,
          createdAt: new Date(),
          createdBy: entry.createdBy,
        });
        const profilePhoto = photos[0];
        await this.uploadImageToStorage(
          profilePhoto,
          `catalog/${docRef.id}/profile.jpg`,
        );

        const otherPhotos = photos.slice(1);
        await this.uploadImagesToStorage(otherPhotos, `catalog/${docRef.id}`);
        Alert.alert('Success', 'Cat entry created successfully!');
        router.back();
      } else {
        Alert.alert(error_message);
      }
    } catch (error) {
      console.error('Error creating catalog entry:', error);
      Alert.alert('Error', 'Failed to create cat entry.');
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
    const folderRef = ref(storage, `catalog/${id}`);
    const listResult = await listAll(folderRef);

    // Find the profile picture regardless of extension
    const profileFile = listResult.items.find((item) => {
      const name = item.name.toLowerCase();
      return name.startsWith('profile.') || name === 'profile';
    });

    const selectedPicRef = ref(storage, `catalog/${id}/${picName}`);

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
    const newExtraPicRef = ref(storage, `catalog/${id}/${picName}`);
    await uploadBytesResumable(newExtraPicRef, oldProfileBlob);

    // 3. Re-upload selected picture as profile picture
    const newProfilePicRef = ref(storage, `catalog/${id}/profile.jpg`);
    await uploadBytesResumable(newProfilePicRef, selectedPicBlob);
  }

  /**
   * Effect: deletes a picture from a catalog entry
   */
  public async deleteCatalogPicture(id: string, picName: string) {
    try {
      const imageRef = ref(storage, `catalog/${id}/${picName}`);
      await deleteObject(imageRef);
      alert('Success Image deleted successfully!');
    } catch (error) {
      alert('Error Failed to delete the image.');
      console.error('Error deleting image: ', error);
    }
  }

  /**
   * Effect: Deletes an existing catalog entry from firebase
   */
  public deleteCatalogEntry(
    id: string,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    Alert.alert(
      'Select Option',
      'Are you sure you want to delete this Catalog entry forever?',
      [
        {
          text: 'Delete Forever',
          onPress: async () =>
            this.confirmDeleteCatalogEntry(id, setVisible, router),
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
   * Private 1
   */
  private async confirmDeleteCatalogEntry(
    id: string,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      await deleteDoc(doc(db, 'catalog', id)); //Delete firestore document

      //Delete storage folder
      const photoPath = `catalog/${id}`;
      const folderRef = ref(storage, photoPath);
      const result = await listAll(folderRef);
      await Promise.all(result.items.map((item) => deleteObject(item)));

      alert('Entry deleted successfully!');
      router.navigate('/catalog');
    } catch (error) {
      alert(error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Private 1
   */
  private generateUniqueFileName(
    existingFiles: string[],
    originalName: string,
  ) {
    const fileNameBase = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
    let newFileName: string;

    do {
      const randomInt = Math.floor(Math.random() * 10000); // Generate random number (0-9999)
      newFileName = `${fileNameBase}_${randomInt}.jpg`;
    } while (existingFiles.includes(newFileName)); // Ensure it's unique

    return newFileName;
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
   * Private 2
   */
  private validateInput(entry: CatalogEntry, photos: string[]) {
    const requiredCatFields: { key: keyof Cat; label: string }[] = [
      { key: 'name', label: 'Name' },
      { key: 'descShort', label: 'Short Description' },
      { key: 'descLong', label: 'Long Description' },
      { key: 'colorPattern', label: 'Color pattern' },
      { key: 'yearsRecorded', label: 'Years recorded' },
      { key: 'AoR', label: 'Area of residence' },
      { key: 'furPattern', label: 'Fur pattern' },
    ];
    if (!entry.cat) {
      return 'Cat creation error with catalog. Please contact an admin.';
    }

    for (const field of requiredCatFields) {
      const value = entry.cat[field.key];
      if (!value || !value.trim()) {
        return `${field.label} field must not be empty`;
      }
    }

    if (photos.length === 0) {
      return 'Please upload a profile photo of the cat.';
    }

    return '';
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
}
export default CatalogService;
