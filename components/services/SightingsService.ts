import { db, storage } from "@/config/firebase";
import { CatSightingObject } from "@/types";
import { uploadFromURI } from "@/utils";
import { Router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, Timestamp, updateDoc, where } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { Dispatch, SetStateAction } from "react";

//Wrapper class for sightings database funcitonality
class SightingsService {

    public constructor() {}

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
            photoUrl: doc.data().image,
            info: doc.data().info,
            latitude: doc.data().latitude,
            longitude: doc.data().longitude,
            name: doc.data().name,
            uid: doc.data().uid || '',
            timeofDay: doc.data().timeofDay
        }));
        setPins(pinsData);
        setMapKey(prev => prev + 1);
    };

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
                uid:doc.data().uid,
                date: doc.data().spotted_time.toDate(),
                fed: doc.data().fed,
                health: doc.data().health,
                photoUrl: doc.data().image,
                info: doc.data().info,
                latitude: doc.data().latitude,
                longitude: doc.data().longitude,
                name: doc.data().name,
                timeofDay: doc.data().timeofDay
            }));
            setSightings(catSightings);
        } catch (error) {
            console.error('Error fetching cat sightings: ', error);
        }
    };

    /**
    * Effect: Submits a new cat sighting to firestore
    */
    public async handleReportSubmission(
        thisSighting:CatSightingObject,
        setVisible: Dispatch<SetStateAction<boolean>>,
        router:Router) {
        try {
            setVisible(true);
            const error_message = this.validateInput(thisSighting);
            if (error_message == "") {
                const result = await uploadFromURI('photos/', thisSighting.photoUrl);
    
                // TODO: It's possible for an image to be created but the database write
                // fails; find a way to either make the entire operation atomic, or
                // implement garbage collection on the storage bucket.
                await addDoc(collection(db, 'cat-sightings'), {
                    timestamp: serverTimestamp(),
                    spotted_time: Timestamp.fromDate(thisSighting.date), // currently unused, but we may want to distinguish
                    // upload and sighting time in the future
                    latitude: thisSighting.latitude,
                    longitude: thisSighting.longitude,
                    name: thisSighting.name,
                    image: result.metadata.fullPath,
                    info: thisSighting.info,
                    healthy: thisSighting.health,
                    fed: thisSighting.fed,
                    timeofDay: thisSighting.timeofDay
                });
    
                alert('Cat submitted successfully!');
                router.navigate('/(app)/(tabs)');
            } else {
                alert(error_message);
            }
        } catch (error) {
            alert(`Upload failed`);
        } finally {
            setVisible(false);
        }
    };

    /**
     * Effect: updates firestore when deleting a cat sighting
     */
    public async deleteSighting(photoUrl:string, docRef:string, router:Router) {
        try {
        if (photoUrl) {
            const imageRef = ref(storage, photoUrl);
            await deleteObject(imageRef);
        }
        await deleteDoc(doc(db, 'cat-sightings', docRef));
        router.push('/(app)/(tabs)');
        alert('Cat sighting deleted successfully!');
        
        } catch (error) {
        alert('Failed to delete sighting.');
        }
    };

  /**
   * Effect: updates firestore when editing a cat sighting
   */
    public async saveSighting(
        thisSighting: CatSightingObject,
        setVisible: Dispatch<SetStateAction<boolean>>,
        router: Router
    ) {
        try {
            setVisible(true);
            const error_message = this.validateInput(thisSighting);
            if (error_message == "") {
                const stamp = Timestamp.fromDate(thisSighting.date);
                const sightingRef = doc(db, 'cat-sightings', thisSighting.id);
                await updateDoc(sightingRef, {
                    timestamp: stamp,
                    fed: thisSighting.fed,
                    health: thisSighting.health,
                    image: thisSighting.photoUrl,
                    info: thisSighting.info,
                    longitude: thisSighting.longitude,
                    latitude: thisSighting.latitude,
                    name: thisSighting.name,
                    uid: thisSighting.uid,
                    timeofDay: thisSighting.timeofDay
                });
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
    private validateInput(thisSighting:CatSightingObject) {
        if (!thisSighting.photoUrl) {
            return 'Please select a photo.';
        } else if (thisSighting.name == '') {
            return 'Please enter a name for the cat.';
        } else if (!thisSighting.date) {
            return 'Please select a date for the sighting.';
        } else if (!thisSighting.timeofDay) {
            return 'Please select a time of day for the sighting.';
        }
        return ""
    }
}

export default SightingsService;
