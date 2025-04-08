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
                profile:"",
                longitude: doc.data().longitude,
                latitude: doc.data().latitude,
                lastStocked: doc.data().lastStocked,
                stockingFreq: doc.data().stockingFreq,
                knownCats: doc.data().knownCats,
                isStocked:StationEntryObject.calculateStocked(doc.data().lastStocked, doc.data().stockingFreq),
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
    public async createStation(thisStation:StationEntryObject, setVisible: Dispatch<SetStateAction<boolean>>, router:Router) {
        try {
            setVisible(true);
            const error_message = this.validateInput(thisStation, 'create');
            if (error_message == "") {
                const stationCollectionRef = collection(db, 'stations');
                const docRef = await addDoc(stationCollectionRef, {
                    name: thisStation.name,
                    longitude: thisStation.longitude,
                    latitude: thisStation.latitude,
                    lastStocked: thisStation.lastStocked,
                    stockingFreq: thisStation.stockingFreq,
                    knownCats: thisStation.knownCats,
                });


                const profilePath = `stations/${docRef.id}/profile.jpg`;
                const storageRef = ref(storage, profilePath);
                const response = await fetch(thisStation.profile);
                const blob = await response.blob();
                await uploadBytes(storageRef, blob);
            
                console.log('Station successfully created with ID: ', docRef.id);
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
        thisStation: StationEntryObject, 
        profileChanged: boolean,
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router
    ) {
        try {
            setVisible(true);
            const error_message = this.validateInput(thisStation, 'save');
            if (error_message == "") {
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
                    const oldProfilePath = `stations/${stationDocRef.id}/profile.jpg`;
                    const oldStorageRef = ref(storage, oldProfilePath);
                    await deleteObject(oldStorageRef);

                    //Upload new profile
                    const profilePath = `stations/${stationDocRef.id}/profile.jpg`;
                    const storageRef = ref(storage, profilePath);
                    console.log('Profile URL:', thisStation.profile);
                    const response = await fetch(thisStation.profile);
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
    public async stockStation(thisStation: StationEntryObject, router:Router) {
        try{
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

    /**
     * Private 2
     */
    private validateInput(thisStation:StationEntryObject, type:string) {
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
            const value = (thisStation as any)[field.key];
            if (!value || !value.trim()) {
                return `${field.label} field must not be empty`;
            }
        }
    
        // Validate longitude and latitude are valid numbers
        if (isNaN(thisStation.longitude) || thisStation.longitude === 0 || isNaN(thisStation.latitude) || thisStation.latitude === 0) {
            return 'Please Select a location on the map';
        }
    
        // Validate that lastStocked is a valid date
        const lastStockedDate = new Date(thisStation.lastStocked);
        if (isNaN(lastStockedDate.getTime())) {
            return 'Last Stocked date is invalid';
        }
    
        // Validate stockingFreq is a positive number
        const stockingFreqNumber = parseInt(thisStation.stockingFreq);
        if (isNaN(stockingFreqNumber) || stockingFreqNumber <= 0) {
        return 'Stocking Frequency must be a positive number';
        }
    
        // If all fields are valid, return an empty string
        return '';
    }
}
export default StationsService;