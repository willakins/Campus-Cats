import { db, storage } from "@/config/firebase";
import { CatSightingObject } from "@/types";
import { Router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, Timestamp, updateDoc, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytesResumable } from "firebase/storage";
import { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";

//Wrapper class for sightings database funcitonality
class SightingsService {

    public constructor() {}

    /**
   * Effect: Pulls cat sightings from firestore and stores them in Marker friendly format
   */
  public async fetchPins(
    setPins: Dispatch<SetStateAction<CatSightingObject[]>>,
    setMapKey: Dispatch<SetStateAction<number>>
  ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'cat-sightings'));
  
      // First gather all raw sightings
      const pins: CatSightingObject[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        date: this.getDateString(doc.data().spotted_time.toDate()),
        fed: doc.data().fed,
        health: doc.data().health,
        info: doc.data().info,
        latitude: doc.data().latitude,
        longitude: doc.data().longitude,
        name: doc.data().name,
        uid: doc.data().uid || '',
        timeofDay: doc.data().timeofDay
      }));
    
      setPins(pins);
      setMapKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching map pins: ', error);
    }
  }

  /**
   * Effect: pulls sighting images from storage
   */
  public async fetchSightingImages(id:string, setPhotos:Dispatch<SetStateAction<string[]>>) {
    try {
      const folderRef = ref(storage, `cat-sightings/${id}`);
      const result = await listAll(folderRef); // Get all files in the folder
  
      // Fetch URLs for each file
      const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
      setPhotos(urls); // Return the list of URLs
  } catch (error) {
      console.error('Error fetching image URLs:', error);
  }
  }
      

  /**
  * Effect: pulls cat sightings from firestore
  */
  public async getSightings(
    name: string,
    setSightings: Dispatch<SetStateAction<CatSightingObject[]>>
  ) {
    try {
      const sightingsRef = collection(db, 'cat-sightings');
      const q = query(sightingsRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);
  
      // Fetch all sightings first
      const catSightingsRaw = querySnapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.data().uid,
        date: this.getDateString(doc.data().spotted_time.toDate()),
        fed: doc.data().fed,
        health: doc.data().health,
        info: doc.data().info,
        latitude: doc.data().latitude,
        longitude: doc.data().longitude,
        name: doc.data().name,
        timeofDay: doc.data().timeofDay
      }));
  
      // Convert each UID to email using parallel fetches
      const catSightingsWithEmails = await Promise.all(
        catSightingsRaw.map(async sighting => {
          try {
            const userDoc = await getDoc(doc(db, 'users', sighting.uid));
            const email = userDoc.exists() ? userDoc.data().email : 'Unknown user';
            return { ...sighting, uid: email };
          } catch (err) {
            console.error(`Failed to fetch email for UID ${sighting.uid}`, err);
            return { ...sighting, uid: 'Error fetching email' };
          }
        })
      );
  
      setSightings(catSightingsWithEmails);
    } catch (error) {
      console.error('Error fetching cat sightings: ', error);
    }
  }

  /**
  * Effect: Submits a new cat sighting to firestore
  */
  public async handleReportSubmission(
    thisSighting:CatSightingObject,
    photos:string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router:Router) {
    try {
      setVisible(true);
      const error_message = this.validateInput(thisSighting, photos);
      if (error_message == "") {
        const docRef = await addDoc(collection(db, 'cat-sightings'), {
          timestamp: serverTimestamp(),
          spotted_time: Timestamp.fromDate(new Date(thisSighting.date)),
          latitude: thisSighting.latitude,
          longitude: thisSighting.longitude,
          name: thisSighting.name,
          info: thisSighting.info,
          healthy: thisSighting.health,
          fed: thisSighting.fed,
          timeofDay: thisSighting.timeofDay,
          uid: thisSighting.uid,
        });
        const folderPath = `cat-sightings/${docRef.id}`;
        await this.uploadImagesToStorage(photos, folderPath);
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
  };

    /**
     * Effect: updates firestore when deleting a cat sighting
     */
    public async deleteSighting(id:string, setVisible:Dispatch<SetStateAction<boolean>>, router:Router) {
      Alert.alert(
              'Select Option',
              'Are you sure you want to delete this sighting forever?',
              [
                {
                  text: 'Delete Forever',
                  onPress: async () => await this.confirmDeleteSighting(id, setVisible, router),
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ],
              { cancelable: true }
            );
    };

    private async confirmDeleteSighting(id:string, setVisible:Dispatch<SetStateAction<boolean>>, router:Router) {
      try {
        const photoPath = `cat-sightings/${id}`;
        const folderRef = ref(storage, photoPath);
        const result = await listAll(folderRef);
        await Promise.all(result.items.map((item) => deleteObject(item)));
        await deleteDoc(doc(db, 'cat-sightings', id));
        router.push('/(app)/(tabs)');
        alert('Cat sighting deleted successfully!');
        
        } catch (error) {
        alert('Failed to delete sighting.');
        }
    }

  /**
   * Effect: updates firestore when editing a cat sighting
   */
    public async saveSighting(
        thisSighting: CatSightingObject,
        photos: string[],
        isPicsChanged: boolean,
        setVisible: Dispatch<SetStateAction<boolean>>,
        router: Router
    ) {
        try {
          setVisible(true);
          const error_message = this.validateInput(thisSighting, photos);
          if (error_message == "") {
              const stamp = Timestamp.fromDate(new Date(thisSighting.date));
              const sightingRef = doc(db, 'cat-sightings', thisSighting.id);
              const docRef = await updateDoc(sightingRef, {
                  spotted_time: stamp,
                  timestamp:serverTimestamp(),
                  fed: thisSighting.fed,
                  health: thisSighting.health,
                  info: thisSighting.info,
                  longitude: thisSighting.longitude,
                  latitude: thisSighting.latitude,
                  name: thisSighting.name,
                  uid: thisSighting.uid,
                  timeofDay: thisSighting.timeofDay
              });
              if (isPicsChanged) {
                // Fetch existing images from Firebase Storage
                const existingImages = await this.fetchExistingImagesFromStorage(`cat-sightings/${thisSighting.id}`);

                // 3. Compare new photos with existing ones
                const newImages = photos.filter(photo => !existingImages.includes(photo)); // Only new images
                const imagesToDelete = existingImages.filter((image: string) => !photos.includes(image)); // Images to remove

                // 4. Delete images that are no longer in the new list (optional)
                for (const image of imagesToDelete) {
                    await this.deleteImageFromStorage(image); // Delete old images from Firebase Storage
                }

                // 5. Upload new images
                if (newImages.length > 0) {
                    await this.uploadImagesToStorage(newImages, `cat-sightings/${thisSighting.id}`);
                }
            }
              router.push('/(app)/(tabs)');
          } else {
              alert(error_message)
          }
        } catch (error) {
            alert(error)
        } finally {
            setVisible(false);
        }
    };

    /**
     * Private 2
     */
    private validateInput(thisSighting:CatSightingObject, photos:string[]) {
        if (thisSighting.name == '') {
          return 'Please enter a name for the cat.';
        } else if (isNaN(thisSighting.longitude) || thisSighting.longitude === 0 || isNaN(thisSighting.latitude) || thisSighting.latitude === 0) {
          return 'Please Select a location on the map';
        } else if (!thisSighting.timeofDay) {
          return 'Please select a time of day for the sighting.';
        } else if (photos.length == 0) {
          return 'Please select a photo.';
        }
        return ""
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
  private async uploadImagesToStorage(images: string[], folderPath: string): Promise<void> {
    try {
      for (const imageUri of images) {
        const imageRef = ref(storage, `${folderPath}/${new Date().toISOString()}`);  // Create a unique ref based on timestamp
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
  private async fetchExistingImagesFromStorage(folderPath: string): Promise<string[]> {
    try {
        const folderRef = ref(storage, folderPath);
        const listResult = await listAll(folderRef);  // List all files in the folder
        const existingImageUrls = await Promise.all(
            listResult.items.map(async (itemRef) => {
                const downloadURL = await getDownloadURL(itemRef); // Get the download URL for each file
                return downloadURL;
            })
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
  private getDateString(date:Date) {
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
      ];
    return`${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }
}
export default SightingsService;