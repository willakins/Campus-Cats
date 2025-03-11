import { db, storage } from "@/config/firebase";
import { AnnouncementEntryObject } from "@/types";
import { Router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";

//Wrapper class for announcements database funcitonality
class AnnouncementsService {

    public constructor() {}

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
    * Effect: updates an existing announcement in firestore
    */
    public async handleAnnouncementSave(
        thisAnn: AnnouncementEntryObject,
        newPhotos: string[], 
        isPicsChanged: boolean, 
        setVisible: Dispatch<SetStateAction<boolean>>, 
        router: Router) {
        try {
            setVisible(true);
            const announcementRef = doc(db, 'announcements', thisAnn.id);
            
            await updateDoc(announcementRef, { //Update firestore
                title: thisAnn.title,
                info: thisAnn.info,
                photos: thisAnn.photos,
                updatedAt: new Date(),
            });

            //Update storage bucket
            if (isPicsChanged) {
                await this.deleteAllImagesInFolder(thisAnn.photos);
                await this.uploadImagesToStorage(newPhotos, thisAnn.photos);
            }
        
            console.log('Announcement updated successfully');
        } catch (error) {
            console.error('Error updating announcement: ', error);
        } finally {
            setVisible(false);
            router.push({
                pathname: '/announcements/view-ann',
                params: { 
                    paramId:thisAnn.id, 
                    paramTitle:thisAnn.title, 
                    paramInfo:thisAnn.info, 
                    paramPhotos:thisAnn.photos, 
                    paramCreated:thisAnn.createdAt },
              });
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
     * Effect: pulls announcement images from storage
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
    * Private 1
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
    }

    /**
    * Private 2
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
    }
}

export default AnnouncementsService;