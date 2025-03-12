import { db, storage } from "@/config/firebase";
import { StationEntryObject } from "@/types";
import { Router } from "expo-router";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { Dispatch, SetStateAction } from "react";

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
            const profilePath = `stations/${thisStation.id}/${thisStation.name}_profilePic.jpg`;
            const storageRef = ref(storage, profilePath);
            const response = await fetch(thisStation.profilePic);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);

            

            const stationCollectionRef = collection(db, 'stations');
            const docRef = await addDoc(stationCollectionRef, {
                id: thisStation.id,
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
    public async editStation() {
        
    }

    /**
     * TODO
     */
    public async deleteStation() {
        
    }
}
export default StationsService;