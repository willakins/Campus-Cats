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
                lastStocked: doc.data().lastStocked,
                stockingFreq: doc.data().stockingFreq,
                knownCats: doc.data().knownCats,
                isStocked: Station.calculateStocked(doc.data().lastStocked, doc.data().stockingFreq),
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
        name:string,
        setProfile: Dispatch<SetStateAction<string>>) {
        try {
            const picRef = ref(storage, `stations/${id}/profile.jpg`);
            const url = await getDownloadURL(picRef);
            setProfile(url);
        } catch (error) {
        }
    }

    /**
     * Effect: Creates a firestore document inside of the 'stations' collection
     */
    public async createStation(photos:string[], setVisible: Dispatch<SetStateAction<boolean>>, router:Router) {
        try {
            setVisible(true);
            const station = getSelectedStation();
            const error_message = this.validateInput(station, 'create');
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
        profileChanged: boolean,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router
    ) {
        try {
            setVisible(true);
            const station = getSelectedStation();
            const error_message = this.validateInput(station, 'save');
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
                if (profileChanged) {
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
    private validateInput(station:Station, type:string) {
        var requiredFields;
        if (type == 'create') {
            requiredFields = [
                { key: 'name', label: 'Name' },
                { key: 'profile', label: 'Profile Photo' },
                { key: 'lastStocked', label: 'Last Stocked' },
                { key: 'stockingFreq', label: 'Stocking Frequency' }
            ];
        } else {
            requiredFields = [
                { key: 'name', label: 'Name' },
                { key: 'lastStocked', label: 'Last Stocked' },
                { key: 'stockingFreq', label: 'Stocking Frequency' }
            ];
        }

        
        // Check for missing or empty required fields
        for (const field of requiredFields) {
            const value = (station as any)[field.key];
            if (!value || !value.trim()) {
                return `${field.label} field must not be empty`;
            }
        }
    
        // Validate longitude and latitude are valid numbers
        if (isNaN(station.location.longitude) || station.location.longitude === 0 || 
            isNaN(station.location.latitude) || station.location.latitude === 0) {
            return 'Please Select a location on the map';
        }
    
        // Validate that lastStocked is a valid date
        const lastStockedDate = new Date(station.lastStocked);
        if (isNaN(lastStockedDate.getTime())) {
            return 'Last Stocked date is invalid';
        }
    
        // Validate stockingFreq is a positive number
        if (isNaN(station.stockingFreq) || station.stockingFreq <= 0) {
        return 'Stocking Frequency must be a positive number';
        }
    
        // If all fields are valid, return an empty string
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