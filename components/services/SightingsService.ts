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
        name: doc.data().name
        // Include the document ID
        }));
        setPins(pinsData);
        setMapKey(prev => prev + 1);
    };

    /**
    * Effect: pulls cat sightings from firestore
    */
    public async getSightings(
        catName: string, 
        setSightings:Dispatch<SetStateAction<CatSightingObject[]>>) {
        try {
        // Create ref, create query, search firestore with query at reference
        const sightingsRef = collection(db, 'cat-sightings');
        const q = query(sightingsRef, where('name', '==', catName));
        const querySnapshot = await getDocs(q);

        // Map each successful query to cat sighting
        const catSightings: CatSightingObject[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().spotted_time.toDate(),
        fed: doc.data().fed,
        health: doc.data().health,
        photoUrl: doc.data().image,
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
    * Effect: Submits a new cat sighting to firestore
    */
    public async handleReportSubmission(
        thisSighting:CatSightingObject,
        router:Router) {
        const errors = this.validateForm(thisSighting.name, thisSighting.info, thisSighting.photoUrl);
        if (errors) {
            alert(errors);
            return;
        }

        try {
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
        thisSighting:CatSightingObject
    ) {
        const stamp = Timestamp.fromDate(thisSighting.date);
        if (!thisSighting.id) {
        alert('Error: docRef is undefined!');
        return;
        }

        const sightingRef = doc(db, 'cat-sightings', thisSighting.id);
        try {
        await updateDoc(sightingRef, {
            timestamp: stamp,
            fed: thisSighting.fed,
            health: thisSighting.health,
            image: thisSighting.photoUrl,
            info: thisSighting.info,
            longitude: thisSighting.longitude,
            latitude: thisSighting.latitude,
            name: thisSighting.name,
        });

        alert('Saved!');
        } catch (error: any) {
        alert(error)
        }
    };

    /**
    * Private 1
    */
    private validateForm(catName:string, photoUrl:string, date:string) {
        if (!photoUrl) {
          return 'Please select a photo.';
        } else if (catName == '' || !date) {
          return 'Please enter all necessary information.';
        }
        return null;    // No errors
    };
}

export default SightingsService;