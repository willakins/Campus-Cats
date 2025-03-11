import { deleteObject, getDownloadURL, getStorage, listAll, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { getDocs, getDoc, updateDoc, doc, collection, query, where, DocumentData, getFirestore, addDoc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { auth, db, storage } from '@/config/firebase';
import { AnnouncementEntryObject, CatalogEntryObject, CatSightingObject } from '@/types';
import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { uploadFromURI } from '@/utils';

//Singleton class
class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {
      // Private constructor ensures no external instances can be created
  }

  // Static method to access the singleton instance
  public static getInstance(): DatabaseService {
      if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      }
      return DatabaseService.instance;
  }

  /**
   * Below are all methods that access the database
   * Current Methods available for the database:
   * 1. fetchCatImages(name, setProfile, setImageUrls?)
   * 2. getSightings(name, setSightings)
   * 3. fetchCatalogData(setCatalogEntries)
   * 4. fetchPins(setPins, setMapKey)
   * 5. handleCatalogSave(catName, oldName, info, id, )
   * 6. handleCatalogCreate()
   * 7. handleReportSubmission()
   * 8. deleteSighting()
   * 9. saveSighting()
   * 10. fetchImage()
   * 11. makeAdmin()
   * 
   * Private methods:
   * 1. isSuperAdmin()
   * 2. queryEmail()
   * 3. generateUniqueFileName()
   * 4. validateForm()
   * 5. getImageUrl()
   * 6. getUser()
   * */ 

  // Overload signatures
  public async fetchCatImages(
      catName: string,
      setProfile: Dispatch<SetStateAction<string>>
  ): Promise<void>;

  public async fetchCatImages(
      catName: string,
      setProfile: Dispatch<SetStateAction<string>>,
      setImageUrls: Dispatch<SetStateAction<string[]>>
  ): Promise<void>;

  /**
   * Implementation that handles both overloads
   * Effect: Pulls images from firestore storage, sets profile picture, sets extra images if applicable
   */
  public async fetchCatImages(
      catName: string,
      setProfile: Dispatch<SetStateAction<string>>,
      setImageUrls?: Dispatch<SetStateAction<string[]>>
  ): Promise<void> {
      try {
          const folderRef = ref(storage, `cats/${catName}/`);
          const result = await listAll(folderRef);
          let extraPicUrls: string[] = [];

          for (const itemRef of result.items) {
              const url = await getDownloadURL(itemRef);
              if (itemRef.name.includes('_profile')) {
                  setProfile(url);
              } else {
                  extraPicUrls.push(url);
              }
          }
          if (setImageUrls) {
              setImageUrls(extraPicUrls);
          }
      } catch (error) {
          console.error('Error fetching images: ', error);
      }
  }

  /**
   * Effect: pulls cat sightings from firestore
   */
  public async getSightings(
    name: string, 
    setSightings:Dispatch<SetStateAction<CatSightingObject[]>>) {
    try {
      // Create ref, create query, search firestore with query at reference
      const sightingsRef = collection(db, 'cat-sightings');
      const q = query(sightingsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);

      // Map each successful query to cat sighting
      const catSightings: CatSightingObject[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      date: doc.data().spotted_time.toDate(),
      fed: doc.data().fed,
      health: doc.data().health,
      photoUri: doc.data().image,
      info: doc.data().info,
      latitude: doc.data().latitude,
      longitude: doc.data().longitude,
      name: doc.data().name
      // Include the document ID
      }));
      setSightings(catSightings);
    } catch (error) {
      console.error('Error fetching cat sightings: ', error);
    }
  };

  /**
   * Effect: Pulls catalog documents from firestore
   */
  public async fetchCatalogData(setCatalogEntries:Dispatch<SetStateAction<CatalogEntryObject[]>> ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'catalog'));
      const entries: CatalogEntryObject[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        info: doc.data().info,
      }));
      setCatalogEntries(entries);
    } catch (error) {
      console.error('Error fetching catalog data: ', error);
    }
  };

  /**
   * Effect: Pulls cat sightings from firestore and stores them in Marker friendly format
   */
  public async fetchPins(setPins:Dispatch<SetStateAction<CatSightingObject[]>>, setMapKey:Dispatch<SetStateAction<number>>) {
    const querySnapshot = await getDocs(collection(db, 'cat-sightings'));
    const pinsData: CatSightingObject[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      date: doc.data().spotted_time.toDate(),
      fed: doc.data().fed,
      health: doc.data().health,
      photoUri: doc.data().image,
      info: doc.data().info,
      latitude: doc.data().latitude,
      longitude: doc.data().longitude,
      name: doc.data().name
      // Include the document ID
    }));
    setPins(pinsData);
    setMapKey(prev => prev + 1);
  };

  /**
   * Effect: Updates firestore and storage when editing a catalog entry
   */
  public async handleCatalogSave(
    catName:string, 
    oldName:string, 
    info:string, 
    newPics:{ url: string; name: string }[], 
    newPhotosAdded:boolean,
    id:string, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
    if (!catName.trim()) {
      alert('Invalid Name Cat name cannot be empty.');
      return;
    }
    try {
      setVisible(true);
      // Reference to the Firestore document using its ID
      const catDocRef = doc(db, 'catalog', id);

      // Update the 'name' field in Firestore
      await updateDoc(catDocRef, { 
        name: catName,
        info: info
      });

      if (oldName !== catName) {
        const oldFolderRef = ref(storage, `cats/${oldName}`);
        const oldPhotos = await listAll(oldFolderRef);

        for (const item of oldPhotos.items) {
          const oldPath = item.fullPath; // Full path of old image
          const newPath = oldPath.replace(`cats/${oldName}`, `cats/${name}`); // New path

          // Download old image data
          const url = await getDownloadURL(item);
          const response = await fetch(url);
          const blob = await response.blob();

          // Upload to new location
          const newImageRef = ref(storage, newPath);
          await uploadBytes(newImageRef, blob);

          // Delete old image
          await deleteObject(item);
        }
      }

      if (newPhotosAdded) {
        const folderPath = `cats/${name}/`; // Path in Firebase Storage
        const folderRef = ref(storage, folderPath);

        // Step 3: Upload only new photos
        for (const pic of newPics) {
          const response = await fetch(pic.url);
          const blob = await response.blob();
          const existingFilesSnapshot = await listAll(folderRef);
          const existingFiles = existingFilesSnapshot.items.map((item) => item.name);

          const unique_name = this.generateUniqueFileName(existingFiles, "Whiskers_.jpg")
          const photoRef = ref(storage, `${folderPath}${unique_name}`);
          await uploadBytes(photoRef, blob);
        }
      }
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Error Failed to update name.');
    } finally {
      setVisible(false);
    }
  };

  /**
   * 
   */
  public async handleCatalogCreate(
    catName:string, 
    info:string,
    profilePic:string, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
    if (!catName.trim()) {
      Alert.alert('Invalid Name', 'Cat name cannot be empty.');
      return;
    }
    try {
      setVisible(true);
      let profilePicUrl = '';

      if (profilePic) {
        const response = await fetch(profilePic);
        const blob = await response.blob();
        const imageRef = ref(getStorage(), `cats/${name}/${name}_profile.jpg`);
        await uploadBytes(imageRef, blob);
       
      }

      await addDoc(collection(db, 'catalog'), {
        catName,
        info,
        createdAt: new Date(),
      });

      Alert.alert('Success', 'Cat entry created successfully!');
    } catch (error) {
      console.error('Error creating catalog entry:', error);
      Alert.alert('Error', 'Failed to create cat entry.');
    } finally {
      setVisible(false);
    }
  };

  /**
   * Effect: Submits a new cat sighting to firestore
   */
  public async handleReportSubmission(
    catName:string, 
    info:string, 
    photoUrl:string, 
    fed:boolean, 
    health:boolean, 
    date:Date, 
    longitude:number, 
    latitude:number) {
    const errors = this.validateForm(catName, info, photoUrl);
    if (errors) {
      alert(errors);
      return;
    }

    try {
      const result = await uploadFromURI('photos/', photoUrl);

      // TODO: It's possible for an image to be created but the database write
      // fails; find a way to either make the entire operation atomic, or
      // implement garbage collection on the storage bucket.
      await addDoc(collection(db, 'cat-sightings'), {
        timestamp: serverTimestamp(),
        spotted_time: Timestamp.fromDate(date), // currently unused, but we may want to distinguish
        // upload and sighting time in the future
        latitude: latitude,
        longitude: longitude,
        name: catName,
        image: result.metadata.fullPath,
        info: info,
        healthy: health,
        fed: fed,
      });

      alert('Cat submitted successfully!');

    } catch (error) {
      if (error instanceof Error) {
        console.error('Error during upload:', error);
        alert(`Upload failed: ${error.message}`);
      }
    }
  };

  /**
   * Effect: updates firestore when deleting a cat sighting
   */
  public async deleteSighting(photoUrl:string, docRef:string) {
    try {
      if (photoUrl) {
        const imageRef = ref(storage, photoUrl);
        await deleteObject(imageRef);
      }
      await deleteDoc(doc(db, 'cat-sightings', docRef));
      alert('Cat sighting deleted successfully!');
      
    } catch (error) {
      alert('Failed to delete sighting.');
    }
  };

  /**
   * Effect: updates firestore when editing a cat sighting
   */
  public async saveSighting(
    docRef: string,
    catName:string, 
    info:string, 
    photoUrl:string, 
    fed:boolean, 
    health:boolean, 
    date:Date, 
    longitude:number, 
    latitude:number
   ) {
    const stamp = Timestamp.fromDate(date);
    if (!docRef) {
      alert('Error: docRef is undefined!');
      return;
    }

    const sightingRef = doc(db, 'cat-sightings', docRef);
    try {
      await updateDoc(sightingRef, {
        timestamp: stamp,
        fed,
        health,
        image: photoUrl,
        info,
        longitude,
        latitude,
        catName,
      });

      alert('Saved!');
    } catch (error: any) {
      alert(error)
    }
  };

  /**
   * Effect: Given a url, fetches the photo
   */
  public async fetchImage(photoUrl:string, setPhoto:Dispatch<SetStateAction<string>>){
    if (photoUrl){
      const url = await this.getImageUrl(photoUrl); // Get the image URL
      if (url) {
        setPhoto(url); // Update the state with the image URL
      }
    }
  };

  /**
   * Effect: Updates firebase to make a new user an admin. Only creates level 1 admins!
   */
  public async makeAdmin(user_email: string) {
    const selfId = this.getUser();
    if (!selfId) {
      return;
    }
    if (!this.isSuperAdmin(selfId)) {
      Alert.alert('You do not have permissions to create admins');
      return;
    }
    const [userId, userData] = await this.queryEmail(user_email) as [string, DocumentData];;

    if (userId) {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId); // Reference to the user's document

      try {
        // Update the field in the user's document
        await updateDoc(userDocRef, {
          role: 1,
        });

        Alert.alert(userData.email + ' is now an admin!');
      } catch (error) {
        Alert.alert('Error updating field: ' + error);
      }
    } else {
      Alert.alert('No user is logged in.');
    }
  };

  /**
   * Effect: Swaps the profile picture for a catalog entry
   */
  public async swapProfilePicture(
    catName:string, 
    picUrl:string, 
    picName:string, 
    profilePicUrl?:string, 
    profilePicName?:string) {
    const oldProfileRef = ref(storage, `cats/${catName}/${profilePicName}`);
    const selectedPicRef = ref(storage, `cats/${catName}/${picName}`);

    // Fetch image blobs
    const oldProfileBlob = await (await fetch(profilePicUrl!)).blob();
    const selectedPicBlob = await (await fetch(picUrl)).blob();

    // Swap images:
    // 1. Delete both files
    await deleteObject(oldProfileRef);
    await deleteObject(selectedPicRef);

    // 2. Re-upload old profile picture as selectedPic.name
    const newExtraPicRef = ref(storage, `cats/${catName}/${catName}`);
    await uploadBytesResumable(newExtraPicRef, oldProfileBlob);

    // 3. Re-upload selected picture as profile picture
    const newProfilePicRef = ref(storage, `cats/${catName}/${catName}_profile.jpg`);
    await uploadBytesResumable(newProfilePicRef, selectedPicBlob);
}

/**
 * Effect: deletes a picture from a catalog entry
 */
public async deleteCatalogPicture(
  catName:string, 
  photoURL: string, 
  setProfile: Dispatch<SetStateAction<string>>,
  setImageUrls: Dispatch<SetStateAction<string[]>>) {
  try {
    const imageRef = ref(storage, `cats/${catName}/${photoURL}`);
    await deleteObject(imageRef);
    this.fetchCatImages(catName, setProfile, setImageUrls);

    alert('Success Image deleted successfully!');
  } catch (error) {
    alert('Error Failed to delete the image.');
    console.error('Error deleting image: ', error);
  }
};

  /**
   * Effect: pulls announcement data from firestore
   */
  public async fetchAnnouncementData(setAnns:Dispatch<SetStateAction<AnnouncementEntryObject[]>>) {
    try {
      const querySnapshot = await getDocs(collection(db, 'announcements'));
      const anns: AnnouncementEntryObject[] = querySnapshot.docs.map( (doc) => ({
        id: doc.id,
        title: doc.data().title,
        info: doc.data().info,
        photos: doc.data().photos,
        createdAt: doc.data().createdAt,
      }));
      setAnns(anns);
    } catch (error) {
      console.error('Error fetching catalog data: ', error);
    }
  }

  /**
   * 
   */
  public async fetchAnnouncementImages(folderPath:string, setImageUrls:Dispatch<SetStateAction<string[]>>) {
    try {
      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef); // Get all files in the folder
  
      // Fetch URLs for each file
      const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
      setImageUrls(urls); // Return the list of URLs
    } catch (error) {
      console.error('Error fetching image URLs:', error);
      throw error;
    }
  }

  /**
   * Effect: creates an announcement and stores it in firestore
   */
  public async handleAnnouncementCreate(title:string, info:string, photos:string[], setVisible:Dispatch<SetStateAction<boolean>>) {
    if (!title.trim() || !info.trim()) {
      Alert.alert('Invalid Title', 'title cannot be empty.');
      return;
    }
    try {
      setVisible(true);

      // Create a unique folder path for this announcement
      const folderPath = `announcements/${Date.now()}-${Math.random()}`;

      // Upload images to Firebase Storage
      await this.uploadImagesToStorage(photos, folderPath);

      // Save announcement document in Firestore
      const docRef = await addDoc(collection(db, 'announcements'), {
        title,
        info,
        photos: folderPath, // Store only the folder path, not individual URLs
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Announcement created successfully!');
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', 'Failed to create announcement.');
    } finally {
      setVisible(false);
    }
  }

  /**
   * 
   */
  public async handleAnnouncementSave(
    id:string,
    title:string, 
    info:string, 
    photoPath:string,
    newPhotos:string[],
    isPicsChanged:boolean, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
      try {
        setVisible(true);
        const announcementRef = doc(db, 'announcements', id);
        
        await updateDoc(announcementRef, { //Update firestore
          title: title,
          info: info,
          photos: photoPath,
          updatedAt: new Date(),
        });

        //Update storage bucket
        if (isPicsChanged) {
          await this.deleteAllImagesInFolder(photoPath);
          await this.uploadImagesToStorage(newPhotos, photoPath);
        }
    
        console.log('Announcement updated successfully');
      } catch (error) {
        console.error('Error updating announcement: ', error);
      } finally {
        setVisible(false);
      }
  }

  /**
   * Effect: Deletes an announcement from database
   */
  public async deleteAnnouncement(photoPath:string, id:string) {
    try {
      if (photoPath) {
        const folderRef = ref(storage, photoPath);
        const result = await listAll(folderRef);
        await Promise.all(result.items.map((item) => deleteObject(item)));
      }
      await deleteDoc(doc(db, 'announcements', id));
      alert('Announcement deleted successfully!');
      
    } catch (error) {
      alert(error);
    }
  }

  /**
   * Private 1
   */
  private async isSuperAdmin(selfId:string) {
    if (selfId) {
      const db = getFirestore();
      const selfDocRef = doc(db, 'users', selfId); // Reference to the user's document

      try {
        // Update the field in the user's document
        const selfData = await getDoc(selfDocRef);
        return selfData.data()?.role == 2;

      } catch (error) {
        Alert.alert('Error getting field: ' + error);
      }
    }
    return false;
  };

  /**
   * Private 2
   */
  private async queryEmail(user_email: string) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', user_email));
    const querySnapshot = await getDocs(q);
    return [querySnapshot.docs[0].id, querySnapshot.docs[0].data()];
  };

  /**
   * Private 3
   */
  private generateUniqueFileName(existingFiles: string[], originalName: string) {
    let fileExtension = originalName.split('.').pop() || ''; // Get file extension (e.g., jpg, png)
    let fileNameBase = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
    let newFileName: string;

    do {
      let randomInt = Math.floor(Math.random() * 10000); // Generate random number (0-9999)
      newFileName = `${fileNameBase}_${randomInt}.${fileExtension}`;
    } while (existingFiles.includes(newFileName)); // Ensure it's unique

    return newFileName;
  }

  /**
   * Private 4
   */
  private validateForm(catName:string, photoUrl:string, date:string) {
    if (!photoUrl) {
      return 'Please select a photo.';
    } else if (catName == '' || !date) {
      return 'Please enter all necessary information.';
    }
    return null;    // No errors
  };

  /**
   * Private 5
   */
  private async getImageUrl(imagePath: string) {
    try {
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return null;
    }
  };

  /**
   * Private 6
   */
  private getUser() {
    const user = auth.currentUser;
    if (user) {
      return user.uid;
    }
    return '';
  }

  /**
   * Private 7
   */
  private async uploadImagesToStorage(photos:string[], folderPath:string) {
    const storageRef = ref(storage, folderPath);
  
    for (const image of photos) {
      const response = await fetch(image); // Fetch local file
      const blob = await response.blob();  // Convert to blob
      const fileName = `${Date.now()}-${Math.random()}.jpg`;
      const imageRef = ref(storageRef, fileName);
  
      await uploadBytes(imageRef, blob);
    }
  };

  /**
   * Private 8
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
  };
}

export default DatabaseService;