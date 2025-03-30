import { db, storage } from "@/config/firebase";
import { StationEntryObject } from "@/types";
import { Router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";

//Wrapper class for stations database funcitonality
class StationsService {
    public constructor() {}

    /**
    * Effect: Pulls a list of stations from firestore
    */
    public async fetchStations(setStationEntries:Dispatch<SetStateAction<StationEntryObject[]>>) {
        try {
            const querySnapshot = await getDocs(collection(db, 'stations'));
            const stations: StationEntryObject[] = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name,
                profilePic: doc.data().profilePic,
                longitude: doc.data().longitude,
                latitude: doc.data().latitude,
                lastStocked: doc.data().lastStocked,
                stockingFreq: doc.data().stockingFreq,
                knownCats: doc.data().knownCats,
                isStocked:false
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
        profilePic: string,
        setProfile: Dispatch<SetStateAction<string>>) {
        try {
            const picRef = ref(storage, profilePic);
            const url = await getDownloadURL(picRef);
            setProfile(url);
        } catch (error) {
            console.error('Error fetching images: ', error);
        }
    }

    /**
     * Effect: Creates a firestore document inside of the 'stations' collection
     */
    public async createStation(thisStation:StationEntryObject, router:Router) {
        try {
            //TODO input validation
            const profilePath = `stations/${thisStation.name}/${thisStation.name}_profilePic.jpg`;
            const storageRef = ref(storage, profilePath);
            const response = await fetch(thisStation.profilePic);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);

            

            const stationCollectionRef = collection(db, 'stations');
            const docRef = await addDoc(stationCollectionRef, {
                name: thisStation.name,
                profilePic: profilePath,
                longitude: thisStation.longitude,
                latitude: thisStation.latitude,
                lastStocked: thisStation.lastStocked,
                stockingFreq: thisStation.stockingFreq,
                knownCats: thisStation.knownCats,
            });
        
            console.log('Station successfully created with ID: ', docRef.id);
            router.navigate('/stations');
          } catch (error) {
            console.error('Error adding document: ', error);
          }
    }

    /**
     * TODO
     */
    public async saveStation(
        thisStation: StationEntryObject, 
        originalName: string,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router
    ) {
        if (!thisStation.name.trim()) {
                alert('Invalid Station name cannot be empty.');
                return;
            }
            try {
                setVisible(true);
                // Reference to the Firestore document using its ID
                const stationDocRef = doc(db, 'stations', thisStation.id);
                
                await updateDoc(stationDocRef, { 
                    knownCats: thisStation.knownCats,
                    name: thisStation.name,
                    lastStocked: thisStation.lastStocked,
                    latitude: thisStation.latitude,
                    longitude:thisStation.longitude,
                    profilePic:thisStation.profilePic,
                    stockingFreq:thisStation.stockingFreq
                });
                if (originalName != thisStation.name) {
                    const oldFolderRef = ref(storage, `stations/${originalName}`);
                    const oldPhotos = await listAll(oldFolderRef);
            
                    for (const item of oldPhotos.items) {
                        const oldPath = item.fullPath; // Full path of old image
                        const newPath = oldPath.replace(`stations/${originalName}`, `stations/${thisStation.name}`); // New path
            
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
        
            } catch (error) {
                console.error('Error updating station:', error);
                alert('Error Failed to update station.');
            } finally {
                setVisible(false);
                router.navigate({
                pathname: '/stations'
                })
            }
    }

    /**
     * Deletes the station from the database
     */
    public async deleteStation(
        id: string, 
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router
    ) {
    Alert.alert(
            'Select Option',
            'Are you sure you want to delete this image forever?',
            [
                {
                text: 'Delete Forever',
                onPress: async () => await this.confirmDeleteStationEntry(id, setVisible, router),
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
    * Private 1
    */
    private async confirmDeleteStationEntry(
        id: string, 
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router) {
        try {
            setVisible(true);
            await deleteDoc(doc(db, 'stations', id)); //Delete firestore document

    
            alert('Station deleted successfully!');
            router.navigate('/stations');
        
        } catch (error) {
            alert(error);
        } finally {
            setVisible(false);
        }
    }
}
export default StationsService;