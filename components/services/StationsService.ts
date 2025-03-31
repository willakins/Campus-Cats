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
                longitude: doc.data().longitude,
                latitude: doc.data().latitude,
                lastStocked: doc.data().lastStocked,
                stockingFreq: doc.data().stockingFreq,
                knownCats: doc.data().knownCats,
                isStocked:StationEntryObject.calculateStocked(doc.data().lastStocked, doc.data().stockingFreq)
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
            const picRef = ref(storage, `stations/${id}/${name}.jpg`);
            const url = await getDownloadURL(picRef);
            setProfile(url);
        } catch (error) {
        }
    }

    /**
     * Effect: Creates a firestore document inside of the 'stations' collection
     */
    public async createStation(thisStation:StationEntryObject, profilePic:string, router:Router) {
        try {
            //TODO input validation
            const stationCollectionRef = collection(db, 'stations');
            const docRef = await addDoc(stationCollectionRef, {
                name: thisStation.name,
                longitude: thisStation.longitude,
                latitude: thisStation.latitude,
                lastStocked: thisStation.lastStocked,
                stockingFreq: thisStation.stockingFreq,
                knownCats: thisStation.knownCats,
            });


            const profilePath = `stations/${docRef.id}/${thisStation.name}.jpg`;
            const storageRef = ref(storage, profilePath);
            const response = await fetch(profilePic);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);
        
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
        profilePic: string,
        profileChanged: boolean,
        originalName:string,
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
                    stockingFreq:thisStation.stockingFreq
                });
                if (profileChanged) {
                    //Delete old profile 
                    const oldProfilePath = `stations/${stationDocRef.id}/${originalName}.jpg`;
                    const oldStorageRef = ref(storage, oldProfilePath);

                    try {
                        await deleteObject(oldStorageRef);
                        console.log('Old profile picture deleted successfully.');
                    } catch (deleteError) {
                        console.warn('Failed to delete old profile picture (might not exist):', deleteError);
                    }

                    //Upload new profile
                    const profilePath = `stations/${stationDocRef.id}/${thisStation.name}.jpg`;
                    const storageRef = ref(storage, profilePath);
                    const response = await fetch(profilePic);
                    const blob = await response.blob();
                    await uploadBytes(storageRef, blob);
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
        photoUrl:string,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router
    ) {
    Alert.alert(
            'Select Option',
            'Are you sure you want to delete this image forever?',
            [
                {
                text: 'Delete Forever',
                onPress: async () => await this.confirmDeleteStationEntry(id, photoUrl, setVisible, router),
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
    public async stockStation(thisStation: StationEntryObject, router:Router,  setVisible: Dispatch<SetStateAction<boolean>>, ) {
        try{
            setVisible(true);
            const stationDocRef = doc(db, 'stations', thisStation.id);
            thisStation.lastStocked = (new Date()).toISOString().split('T')[0];
            await updateDoc(stationDocRef, { 
                knownCats: thisStation.knownCats,
                name: thisStation.name,
                lastStocked: thisStation.lastStocked,
                latitude: thisStation.latitude,
                longitude:thisStation.longitude,
                stockingFreq:thisStation.stockingFreq
            });
        } catch(error) {} finally {
            setVisible(false);
            setTimeout(() => {
                router.navigate('/stations');
              }, 500);
        }
    }

    /**
    * Private 1
    */
    private async confirmDeleteStationEntry(
        id: string, 
        photoUrl:string,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router) {
        try {
            setVisible(true);
            await deleteDoc(doc(db, 'stations', id)); //Delete firestore document

            if (photoUrl) {
                const imageRef = ref(storage, photoUrl);
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
}
export default StationsService;