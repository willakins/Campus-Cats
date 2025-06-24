import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';

import { Router } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';

import { auth, db, storage } from '@/config/firebase';
import { getSelectedAnnouncement } from '@/stores/announcementStores';
import { Announcement } from '@/types';

//Wrapper class for announcements database funcitonality
class AnnouncementsService {
  /**
   * Effect: pulls announcement data from firestore
   */
  public async fetchAnnouncementData(
    setAnns: Dispatch<SetStateAction<Announcement[]>>,
  ) {
    try {
      const annsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'), // descending order
      );

      const querySnapshot = await getDocs(annsQuery);
      const anns: Announcement[] = querySnapshot.docs.map((document) => ({
        id: document.id,
        title: document.data().title,
        info: document.data().info,
        createdAt: document.data().createdAt.toDate(),
        createdBy: document.data().createdBy,
        authorAlias: document.data().authorAlias,
      }));
      setAnns(anns);
    } catch (error) {
      console.error('Error fetching catalog data: ', error);
    }
  }

  /**
   * Effect: creates an announcement and stores it in firestore
   */
  public async handleAnnouncementCreate(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      const ann = getSelectedAnnouncement();
      const error_message = this.validate_input(ann);
      if (error_message === '') {
        setVisible(true);
        const functions = getFunctions();
        const sendAnnouncement = httpsCallable(functions, 'sendAnnouncement');
        // Get the current user's ID token
        const currentUser = auth.currentUser;

        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        await currentUser.getIdToken();

        try {
          await sendAnnouncement({
            title: ann.title,
            message: ann.info,
          });
        } catch (error) {
          console.error('Failed to send push notification:', error);
        }
        // Save announcement document in Firestore
        const docRef = await addDoc(collection(db, 'announcements'), {
          title: ann.title,
          info: ann.info,
          createdAt: new Date(),
          createdBy: ann.createdBy,
          authorAlias: ann.authorAlias,
        });

        // Create a unique folder path for this announcement
        const folderPath = `announcements/${docRef.id}`;
        await this.uploadImagesToStorage(photos, folderPath);
        Alert.alert('Announcement created successfully!');
        router.navigate('/announcements');
      } else {
        Alert.alert(error_message);
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Failed to create announcement.');
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: updates an existing announcement in firestore
   */
  public async handleAnnouncementSave(
    photos: string[],
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const ann = getSelectedAnnouncement();
      const error_message = this.validate_input(ann);
      if (error_message === '') {
        const announcementRef = doc(db, 'announcements', ann.id);
        await updateDoc(announcementRef, {
          //Update firestore
          title: ann.title,
          info: ann.info,
          createdAt: serverTimestamp(),
          createdBy: ann.createdBy,
          authorAlias: ann.authorAlias,
        });

        //Update storage bucket
        if (isPicsChanged) {
          // Fetch existing images from Firebase Storage
          const existingImages = await this.fetchExistingImagesFromStorage(
            `announcements/${announcementRef.id}`,
          );

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
              `announcements/${announcementRef.id}`,
            );
          }
        }
        router.push('/(app)/announcements/view-ann');
      } else {
        Alert.alert(error_message);
      }
    } catch (error) {
      console.error('Error updating announcement: ', error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: Deletes an announcement from database
   */
  public async deleteAnnouncement(
    id: string,
    router: Router,
    setVisible: Dispatch<SetStateAction<boolean>>,
  ) {
    try {
      setVisible(true);
      const photoPath = `announcements/${id}`;
      if (photoPath) {
        const folderRef = ref(storage, photoPath);
        const result = await listAll(folderRef);
        await Promise.all(result.items.map((item) => deleteObject(item)));
      }
      await deleteDoc(doc(db, 'announcements', id));
      alert('Announcement deleted successfully!');
      router.navigate('/announcements');
    } catch (error) {
      alert(error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: pulls announcement images from storage
   */
  public async fetchAnnouncementImages(
    id: string,
    setImageUrls: Dispatch<SetStateAction<string[]>>,
  ) {
    try {
      const folderRef = ref(storage, `announcements/${id}`);
      const result = await listAll(folderRef); // Get all files in the folder

      // Fetch URLs for each file
      const urls = await Promise.all(
        result.items.map((item) => getDownloadURL(item)),
      );
      setImageUrls(urls); // Return the list of URLs
    } catch (error) {
      console.error('Error fetching image URLs:', error);
    }
  }

  /**
   * Private 2
   */
  private async deleteAllImagesInFolder(folderPath: string) {
    try {
      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);
      await Promise.all(result.items.map((item) => deleteObject(item)));

      console.log('All old images deleted successfully');
    } catch (error) {
      console.error('Error deleting images in folder: ', error);
      throw error;
    }
  }

  /**
   * Private 3
   */
  private validate_input(ann: Announcement) {
    if (!ann.title.trim()) {
      return 'Title cannot be empty.';
    }
    if (!ann.info.trim()) {
      return 'Description cannot be empty.';
    }
    return '';
  }

  /**
   * Private 4
   */
  private getDateString(date: Date) {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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

  // Helper method to upload images to Firebase Storage
  private async uploadImagesToStorage(
    images: string[],
    folderPath: string,
  ): Promise<void> {
    try {
      for (const imageUri of images) {
        const imageRef = ref(
          storage,
          `${folderPath}/${new Date().toISOString()}`,
        ); // Create a unique ref based on timestamp
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytesResumable(imageRef, blob); // Upload image to Firebase Storage
        console.log(`Image ${imageUri} uploaded to ${imageRef.fullPath}`);
      }
    } catch (error) {
      console.error('Error uploading images to storage: ', error);
    }
  }
}
export default AnnouncementsService;
