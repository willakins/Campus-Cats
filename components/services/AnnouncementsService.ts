import { db, storage } from "@/config/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { AnnouncementEntryObject, User } from "@/types";
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
                createdAt: this.getDateString(doc.data().createdAt.toDate()),
                createdBy: doc.data().createdBy.email,
            }));
            setAnns(anns);
        } catch (error) {
            console.error('Error fetching catalog data: ', error);
        }
    }

    /**
    * Effect: creates an announcement and stores it in firestore
    */
    public async handleAnnouncementCreate(
        title:string, 
        info:string, 
        photos:string[], 
        user:User,
        setVisible:Dispatch<SetStateAction<boolean>>,
        router: Router) {
        try {
            const error_message = this.validate_input(title, info)
            if (error_message == "") {
                setVisible(true);
    
                // Save announcement document in Firestore
                const docRef = await addDoc(collection(db, 'announcements'), {
                title,
                info,
                createdAt: new Date(),
                createdBy: user
                });

                // Create a unique folder path for this announcement
                const folderPath = `announcements/${docRef}`;
                await this.uploadImagesToStorage(photos, folderPath);
                Alert.alert('Announcement created successfully!');
                router.push('/announcements');
            } else {
                Alert.alert(error_message)
            }
        } catch (error) {
          console.error('Error creating announcement:', error);
          Alert.alert('Failed to create announcement.');
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
            const error_message = this.validate_input(thisAnn.title, thisAnn.info);
            if (error_message == "") {
                setVisible(true);
                const announcementRef = doc(db, 'announcements', thisAnn.id);
                
                await updateDoc(announcementRef, { //Update firestore
                    title: thisAnn.title,
                    info: thisAnn.info,
                    createdAt: new Date(),
                    createdBy: thisAnn.createdBy
                });

                //Update storage bucket
                if (isPicsChanged) {
                    await this.deleteAllImagesInFolder(`announcements/${announcementRef}`);
                    await this.uploadImagesToStorage(newPhotos, `announcements/${announcementRef}`);
                }
            
                console.log('Announcement updated successfully');
                router.push({
                    pathname: '/announcements/view-ann',
                    params: { 
                        paramId:thisAnn.id, 
                        paramTitle:thisAnn.title, 
                        paramInfo:thisAnn.info, 
                        paramCreated:thisAnn.createdAt },
                  });
            } else {
                Alert.alert(error_message);
            }
        } catch (error) {
            console.error('Error updating announcement: ', error);
        } finally {
            setVisible(false);
        }
    }

    /**
    * Effect: Deletes an announcement from database
    */
    public async deleteAnnouncement(id:string) {
        try {
            const photoPath = `announcements/${id}`;
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
    public async fetchAnnouncementImages(id:string, setImageUrls:Dispatch<SetStateAction<string[]>>) {
        try {
            const folderRef = ref(storage, `announcements/${id}`);
            const result = await listAll(folderRef); // Get all files in the folder
        
            // Fetch URLs for each file
            const urls = await Promise.all(result.items.map((item) => getDownloadURL(item)));
            setImageUrls(urls); // Return the list of URLs
        } catch (error) {
            console.error('Error fetching image URLs:', error);
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

    /**
     * Private 3
     */
    private validate_input(title:string, info:string) {
        if (!title.trim()) {
            return "Error: Title cannot be empty.";
        }
        if (!info.trim()) {
            return "Error: Info description cannot be empty.";
        }
        return "";
    }

    /**
     * Private 4
     */
    private getDateString(date:Date) {
        const monthNames = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
          ];
        return`${monthNames[date.getMonth()]}, ${date.getDate()}, ${date.getFullYear()}`;
    }
}
export default AnnouncementsService;