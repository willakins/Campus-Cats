import { db, storage } from "@/config/firebase";
import { getSelectedStation } from "@/stores/stationStores";
import { Station } from "@/types";
import { Router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";

//Wrapper class for stations database funcitonality
class StationsService {
    public constructor() {}

    /**
    * Effect: Pulls a list of stations from firestore
    */
    public async fetchStations(setStationEntries:Dispatch<SetStateAction<Station[]>>) {
        try {
            const querySnapshot = await getDocs(collection(db, 'stations'));
            const stations: Station[] = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name,
                location: doc.data().location,
                lastStocked: doc.data().lastStocked.toDate(),
                stockingFreq: doc.data().stockingFreq,
                knownCats: doc.data().knownCats,
                isStocked: Station.calculateStocked(doc.data().lastStocked.toDate(), doc.data().stockingFreq),
                createdBy: doc.data().createdBy,
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
        setPhotos: Dispatch<SetStateAction<string[]>>) {
        try {
            const folderRef = ref(storage, `stations/${id}`);
            const result = await listAll(folderRef);
            
            // Fetch all download URLs
            const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
            
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
            setPhotos(otherImages);
            
          } catch (error) {
            console.error('Error fetching image URLs:', error);
          }
    }

    /**
     * Effect: Creates a firestore document inside of the 'stations' collection
     */
    public async createStation(photos:string[], setVisible: Dispatch<SetStateAction<boolean>>, router:Router) {
        try {
            setVisible(true);
            const station = getSelectedStation();
            const error_message = this.validateInput(station);
            if (error_message == "") {
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
                await this.uploadImageToStorage(profilePhoto, `stations/${docRef.id}/profile.jpg`);
  
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
        isPicsChanged:boolean,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router
    ) {
        try {
            setVisible(true);
            const station = getSelectedStation();
            const error_message = this.validateInput(station);
            if (error_message == "") {
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
                    //Delete old profile 
                    const oldProfilePath = `stations/${stationDocRef.id}/profile.jpg`;
                    const oldStorageRef = ref(storage, oldProfilePath);
                    await deleteObject(oldStorageRef);

                    //Upload new profile
                    const profilePath = `stations/${stationDocRef.id}/profile.jpg`;
                    const storageRef = ref(storage, profilePath);
                    console.log('Profile URL:', profile);
                    const response = await fetch(profile);
                    const blob = await response.blob();
                    await uploadBytes(storageRef, blob);
                }
            } else {
                alert(error_message);
            }
        } catch (error) {
            console.error('Error updating station:', error);
            alert('Error Failed to update station.');
        } finally {
            setVisible(false);
            router.navigate({pathname: '/stations'})
        }
    }

    /**
     * Deletes the station from the database
     */
    public async deleteStation(
        profile:string,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router
    ) {
        Alert.alert(
            'Select Option',
            'Are you sure you want to delete this image forever?',
            [
                {
                text: 'Delete Forever',
                onPress: async () => await this.confirmDeleteStationEntry(profile, setVisible, router),
                },
                {
                text: 'Cancel',
                style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    }

    /**
    * Effect: Stocks a station
    */
    public async stockStation(router:Router) {
        try{
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
        } catch(error) {} finally {
            setTimeout(() => {
                router.navigate('/stations');
              }, 500);
        }
    }

    /**
    * Private 1
    */
    private async confirmDeleteStationEntry(
        profile:string,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router) {
        try {
            setVisible(true);
            const station = getSelectedStation();
            await deleteDoc(doc(db, 'stations', station.id)); //Delete firestore document

            if (profile) {
                const imageRef = ref(storage, profile);
                await deleteObject(imageRef);
            }
    
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
    private validateInput(station: Station): string {
        // Validate required string fields
        if (!station.name || typeof station.name !== 'string' || station.name.trim().length === 0) {
          return 'Name field must not be empty';
        }
      
        // Validate that lastStocked is a valid Date object
        if (!(station.lastStocked instanceof Date) || isNaN(station.lastStocked.getTime())) {
          return 'Last Stocked date is invalid';
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
        alert(station.stockingFreq)
        alert(typeof station.stockingFreq)
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
      private async uploadImageToStorage(
        photoUri: string, 
        filePath: string
      ) {
        const storageRef = ref(storage, filePath);
        const response = await fetch(photoUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
      }
        
    
      // Helper method to upload images to Firebase Storage
      private async uploadImagesToStorage(images: string[], folderPath: string): Promise<void> {
        try {
          for (const imageUri of images) {
            const uniqueFilename = this.generateUniqueFileName([], '');
            const imageRef = ref(storage, `${folderPath}/${uniqueFilename}`);  // Create a unique ref based on timestamp
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
       private generateUniqueFileName(existingFiles: string[], originalName: string) {
        let fileNameBase = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
        let newFileName: string;
    
        do {
            let randomInt = Math.floor(Math.random() * 1000000000); // Generate random number (0-9999)
            newFileName = `${fileNameBase}_${randomInt}.jpg`;
        } while (existingFiles.includes(newFileName)); // Ensure it's unique
    
        return newFileName;
      }
}
export default StationsService;