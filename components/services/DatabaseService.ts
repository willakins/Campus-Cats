import { deleteObject, getDownloadURL, getStorage, listAll, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { getDocs, getDoc, updateDoc, doc, collection, query, where, DocumentData, getFirestore, addDoc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { auth, db, storage } from '@/config/firebase';
import { AnnouncementEntryObject, CatalogEntryObject, CatSightingObject } from '@/types';
import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { uploadFromURI } from '@/utils';
import CatalogService from './CatalogService';
import SightingsService from './SightingsService';
import AnnouncementsService from './AnnouncementsService';
import StationsService from './StationsService';

//Singleton class
class DatabaseService {
  private static instance: DatabaseService;
  private static catalogService: CatalogService = new CatalogService();
  private static announcementsService: AnnouncementsService = new AnnouncementsService();
  private static sightingsService: SightingsService = new SightingsService();
  private static stationsService: StationsService = new StationsService();

  private constructor() {
      // Private constructor ensures no external instances can be created
  }

  // Static method to access the singleton instance
  public static getInstance(): DatabaseService {
      if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      }
      return DatabaseService.instance;
  }

  /**
   * Below are all methods that access the database
   * Current Methods available for the database:
   * 1. fetchCatImages(name, setProfile, setImageUrls?)
   * 2. getSightings(name, setSightings)
   * 3. fetchCatalogData(setCatalogEntries)
   * 4. fetchPins(setPins, setMapKey)
   * 5. handleCatalogSave(catName, oldName, info, id, )
   * 6. handleCatalogCreate()
   * 7. handleReportSubmission()
   * 8. deleteSighting()
   * 9. saveSighting()
   * 10. fetchImage()
   * 11. makeAdmin()
   * 
   * Private methods:
   * 1. isSuperAdmin()
   * 2. queryEmail()
   * 3. generateUniqueFileName()
   * 4. validateForm()
   * 5. getImageUrl()
   * 6. getUser()
   * */ 
  
  /**
   * Effect: Updates firebase to make a new user an admin. Only creates level 1 admins!
   */
  public async makeAdmin(user_email: string) {
    const selfId = this.getUser();
    if (!selfId) {
      return;
    }
    if (!this.isSuperAdmin(selfId)) {
      Alert.alert('You do not have permissions to create admins');
      return;
    }
    const [userId, userData] = await this.queryEmail(user_email) as [string, DocumentData];;

    if (userId) {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId); // Reference to the user's document

      try {
        // Update the field in the user's document
        await updateDoc(userDocRef, {
          role: 1,
        });

        Alert.alert(userData.email + ' is now an admin!');
      } catch (error) {
        Alert.alert('Error updating field: ' + error);
      }
    } else {
      Alert.alert('No user is logged in.');
    }
  }

  /**
   * Effect: Pulls cat sightings from firestore and stores them in Marker friendly format
   */
  public async fetchPins(setPins:Dispatch<SetStateAction<CatSightingObject[]>>, setMapKey:Dispatch<SetStateAction<number>>) {
    const querySnapshot = await getDocs(collection(db, 'cat-sightings'));
    DatabaseService.sightingsService.fetchPins(setPins, setMapKey);
  }

  /**
   * Effect: pulls cat sightings from firestore
   */
  public async getSightings(
    catName: string, 
    setSightings:Dispatch<SetStateAction<CatSightingObject[]>>) {
    DatabaseService.sightingsService.getSightings(catName, setSightings);
  }

  /**
   * Effect: updates firestore when editing a cat sighting
   */
  public async saveSighting(
    docRef: string,
    catName:string, 
    info:string, 
    photoUrl:string, 
    fed:boolean, 
    health:boolean, 
    date:Date, 
    longitude:number, 
    latitude:number
   ) {
    DatabaseService.sightingsService.saveSighting(docRef, catName, info, photoUrl, fed, health, date, longitude, latitude);
  }

  /**
   * Effect: Submits a new cat sighting to firestore
   */
  public async handleReportSubmission(
    catName:string, 
    info:string, 
    photoUrl:string, 
    fed:boolean, 
    health:boolean, 
    date:Date, 
    longitude:number, 
    latitude:number) {
    DatabaseService.sightingsService.handleReportSubmission(catName, info, photoUrl, fed, health, date, longitude, latitude);
  }

  /**
   * Effect: updates firestore when deleting a cat sighting
   */
  public async deleteSighting(photoUrl:string, docRef:string) {
    DatabaseService.sightingsService.deleteSighting(photoUrl, docRef);
  }

  /**
   * Effect: Given a url, fetches the photo
   */
  public async fetchImage(photoUrl:string, setPhoto:Dispatch<SetStateAction<string>>){
    if (photoUrl){
      const url = await this.getImageUrl(photoUrl); // Get the image URL
      if (url) {
        setPhoto(url); // Update the state with the image URL
      }
    }
  }

  // Overload signatures
  public async fetchCatImages(
      catName: string,
      setProfile: Dispatch<SetStateAction<string>>
  ): Promise<void>;

  public async fetchCatImages(
      catName: string,
      setProfile: Dispatch<SetStateAction<string>>,
      setImageUrls: Dispatch<SetStateAction<string[]>>
  ): Promise<void>;

  /**
   * Implementation that handles both overloads
   * Effect: Pulls images from firestore storage, sets profile picture, sets extra images if applicable
   */
  public async fetchCatImages(
    catName: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setImageUrls?: Dispatch<SetStateAction<string[]>>
  ): Promise<void> {
    if (setImageUrls){
      DatabaseService.catalogService.fetchCatImages(catName, setProfile, setImageUrls);
    } else {
      DatabaseService.catalogService.fetchCatImages(catName, setProfile);
    }
  }

  /**
   * Effect: Pulls catalog documents from firestore
   */
  public async fetchCatalogData(setCatalogEntries:Dispatch<SetStateAction<CatalogEntryObject[]>> ) {
    DatabaseService.catalogService.fetchCatalogData(setCatalogEntries);
  }

  
  /**
   * Effect: Updates firestore and storage when editing a catalog entry
   */
  public async handleCatalogSave(
    catName:string, 
    oldName:string, 
    info:string, 
    newPics:{ url: string; name: string }[], 
    newPhotosAdded:boolean,
    id:string, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
    DatabaseService.catalogService.handleCatalogSave(catName, oldName, info, newPics, newPhotosAdded, id, setVisible);
  }

  /**
   * Effect: Creates a new catalog entry and stores it in firebase
   */
  public async handleCatalogCreate(
    catName:string, 
    info:string,
    profilePic:string, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
    DatabaseService.catalogService.handleCatalogCreate(catName, info, profilePic, setVisible);
  }

  /**
   * Effect: Deletes an existing catalog entry from firebase
   */
  public async deleteCatalogEntry() {
    DatabaseService.catalogService.deleteCatalogEntry();
  }

  /**
   * Effect: Swaps the profile picture for a catalog entry
   */
  public async swapProfilePicture(
    catName:string, 
    picUrl:string, 
    picName:string, 
    profilePicUrl?:string, 
    profilePicName?:string) {
    DatabaseService.catalogService.swapProfilePicture(catName, picUrl, picName, profilePicUrl, profilePicName);
  }

  /**
  * Effect: deletes a picture from a catalog entry
  */
  public async deleteCatalogPicture(
    catName:string, 
    picName: string, 
    setProfile: Dispatch<SetStateAction<string>>,
    setImageUrls: Dispatch<SetStateAction<string[]>>) {
    DatabaseService.catalogService.deleteCatalogPicture(catName, picName, setProfile, setImageUrls);
  }

  /**
   * Effect: pulls announcement data from firestore
   */
  public async fetchAnnouncementData(setAnns:Dispatch<SetStateAction<AnnouncementEntryObject[]>>) {
    DatabaseService.announcementsService.fetchAnnouncementData(setAnns);
  }

  /**
   * Effect: pulls announcement images from storage
   */
  public async fetchAnnouncementImages(folderPath:string, setImageUrls:Dispatch<SetStateAction<string[]>>) {
    DatabaseService.announcementsService.fetchAnnouncementImages(folderPath, setImageUrls);
  }

  /**
   * Effect: creates an announcement and stores it in firestore
   */
  public async handleAnnouncementCreate(title:string, info:string, photos:string[], setVisible:Dispatch<SetStateAction<boolean>>) {
    DatabaseService.announcementsService.handleAnnouncementCreate(title, info, photos, setVisible);
  }

  /**
   * Effect: updates an existing announcement in firestore
   */
  public async handleAnnouncementSave(
    id:string,
    title:string, 
    info:string, 
    photoPath:string,
    newPhotos:string[],
    isPicsChanged:boolean, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
    DatabaseService.announcementsService.handleAnnouncementSave(id, title, info, photoPath, newPhotos, isPicsChanged, setVisible);
  }

  /**
   * Effect: Deletes an announcement from database
   */
  public async deleteAnnouncement(photoPath:string, id:string) {
    DatabaseService.announcementsService.deleteAnnouncement(photoPath, id);
  }

  /**
   * TODO
   */
  public async fetchStations() {
    DatabaseService.stationsService.fetchStations();
  }

  /**
   * TODO
   */
  public async createStation() {
    DatabaseService.stationsService.createStation();
  }

  /**
   * TODO
   */
  public async editStation() {
    DatabaseService.stationsService.editStation();
  }

  /**
   * TODO
   */
  public async deleteStation() {
    DatabaseService.stationsService.deleteStation();
  }

  /**
   * 
   * 
   * Private Methods beyond this point
   * 
   * 
   */
  /**
   * Private 1
   */
  private async isSuperAdmin(selfId:string) {
    if (selfId) {
      const db = getFirestore();
      const selfDocRef = doc(db, 'users', selfId); // Reference to the user's document

      try {
        // Update the field in the user's document
        const selfData = await getDoc(selfDocRef);
        return selfData.data()?.role == 2;

      } catch (error) {
        Alert.alert('Error getting field: ' + error);
      }
    }
    return false;
  };

  /**
   * Private 2
   */
  private async queryEmail(user_email: string) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', user_email));
    const querySnapshot = await getDocs(q);
    return [querySnapshot.docs[0].id, querySnapshot.docs[0].data()];
  };

  /**
   * Private 3
   */
  private async getImageUrl(imagePath: string) {
    try {
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return null;
    }
  };

  /**
   * Private 4
   */
  private getUser() {
    const user = auth.currentUser;
    if (user) {
      return user.uid;
    }
    return '';
  }
}
export default DatabaseService;