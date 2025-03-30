import { deleteObject, getDownloadURL, getStorage, listAll, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { getDocs, getDoc, updateDoc, doc, collection, query, where, DocumentData, getFirestore, addDoc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { auth, db, storage } from '@/config/firebase';
import { AnnouncementEntryObject, CatalogEntryObject, CatSightingObject, ContactInfo, StationEntryObject, User } from '@/types';
import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { uploadFromURI } from '@/utils';
import CatalogService from './CatalogService';
import SightingsService from './SightingsService';
import AnnouncementsService from './AnnouncementsService';
import StationsService from './StationsService';
import { Router } from 'expo-router';
import SettingsService from './SettingsService';

//Singleton class
class DatabaseService {
  private static instance: DatabaseService;
  private static catalogService: CatalogService = new CatalogService();
  private static announcementsService: AnnouncementsService = new AnnouncementsService();
  private static sightingsService: SightingsService = new SightingsService();
  private static stationsService: StationsService = new StationsService();
  private static settingsService: SettingsService = new SettingsService();

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
    await DatabaseService.sightingsService.fetchPins(setPins, setMapKey);
  }

  /**
   * Effect: pulls cat sightings from firestore
   */
  public async getSightings(
    catName: string, 
    setSightings:Dispatch<SetStateAction<CatSightingObject[]>>) {
    await DatabaseService.sightingsService.getSightings(catName, setSightings);
  }

  /**
   * Effect: updates firestore when editing a cat sighting
   */
  public async saveSighting(
   thisSighting:CatSightingObject
   ) {
    await DatabaseService.sightingsService.saveSighting(thisSighting);
  }

  /**
   * Effect: Submits a new cat sighting to firestore
   */
  public async handleReportSubmission(
    thisSighting:CatSightingObject,
    router:Router) {
    await DatabaseService.sightingsService.handleReportSubmission(thisSighting, router);
  }

  /**
   * Effect: updates firestore when deleting a cat sighting
   */
  public async deleteSighting(photoUrl:string, docRef:string) {
    await DatabaseService.sightingsService.deleteSighting(photoUrl, docRef);
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
      await DatabaseService.catalogService.fetchCatImages(catName, setProfile, setImageUrls);
    } else {
      await DatabaseService.catalogService.fetchCatImages(catName, setProfile);
    }
  }

  /**
   * Effect: Pulls catalog documents from firestore
   */
  public async fetchCatalogData(setCatalogEntries:Dispatch<SetStateAction<CatalogEntryObject[]>> ) {
    await DatabaseService.catalogService.fetchCatalogData(setCatalogEntries);
  }

  
  /**
   * Effect: Updates firestore and storage when editing a catalog entry
   */
  public async handleCatalogSave(
    catName: string, 
    oldName: string, 
    info: string, 
    newPics: { url: string; name: string; }[], 
    newPhotosAdded: boolean, 
    id: string, setVisible: 
    Dispatch<SetStateAction<boolean>>, 
    router: Router) {
    await DatabaseService.catalogService.handleCatalogSave(catName, oldName, info, newPics, newPhotosAdded, id, setVisible, router);
  }

  /**
   * Effect: Creates a new catalog entry and stores it in firebase
   */
  public async handleCatalogCreate(
    catName: string, 
    info: string, 
    profilePic: string, 
    setVisible: Dispatch<SetStateAction<boolean>>, 
    router: Router) {
    await DatabaseService.catalogService.handleCatalogCreate(catName, info, profilePic, setVisible, router);
  }

  /**
   * Effect: Deletes an existing catalog entry from firebase
   */
  public async deleteCatalogEntry(
    catName: string, 
    id: string, 
    setVisible: Dispatch<SetStateAction<boolean>>, 
    router: Router,) {
    await DatabaseService.catalogService.deleteCatalogEntry(catName, id, setVisible, router);
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
    await DatabaseService.catalogService.swapProfilePicture(catName, picUrl, picName, profilePicUrl, profilePicName);
  }

  /**
  * Effect: deletes a picture from a catalog entry
  */
  public async deleteCatalogPicture(
    catName:string, 
    picName: string, 
    setProfile: Dispatch<SetStateAction<string>>,
    setImageUrls: Dispatch<SetStateAction<string[]>>) {
    await DatabaseService.catalogService.deleteCatalogPicture(catName, picName, setProfile, setImageUrls);
  }

  /**
   * Effect: pulls announcement data from firestore
   */
  public async fetchAnnouncementData(setAnns:Dispatch<SetStateAction<AnnouncementEntryObject[]>>) {
    await DatabaseService.announcementsService.fetchAnnouncementData(setAnns);
  }

  /**
   * Effect: pulls announcement images from storage
   */
  public async fetchAnnouncementImages(folderPath:string, setImageUrls:Dispatch<SetStateAction<string[]>>) {
    await DatabaseService.announcementsService.fetchAnnouncementImages(folderPath, setImageUrls);
  }

  /**
   * Effect: creates an announcement and stores it in firestore
   */
  public async handleAnnouncementCreate(title:string, info:string, photos:string[], setVisible:Dispatch<SetStateAction<boolean>>) {
    await DatabaseService.announcementsService.handleAnnouncementCreate(title, info, photos, setVisible);
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
    await DatabaseService.announcementsService.handleAnnouncementSave(thisAnn, newPhotos, isPicsChanged, setVisible, router);
  }

  /**
   * Effect: Deletes an announcement from database
   */
  public async deleteAnnouncement(photoPath:string, id:string) {
    await DatabaseService.announcementsService.deleteAnnouncement(photoPath, id);
  }

  /**
   * Effect: Gets all stations from firebase
   */
  public async fetchStations(setStationEntries:Dispatch<SetStateAction<StationEntryObject[]>>) {
    await DatabaseService.stationsService.fetchStations(setStationEntries);
  }

  /**
   * Effect: Adds a new station to firebase
   */
  public async createStation(thisStation:StationEntryObject, router:Router) {
    await DatabaseService.stationsService.createStation(thisStation, router);
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
    await DatabaseService.stationsService.saveStation(thisStation, originalName, setVisible, router);
  }

  /**
   * TODO
   */
  public async deleteStation(
    id: string, 
    setVisible: Dispatch<SetStateAction<boolean>>, 
    router: Router
  ) {
    await DatabaseService.stationsService.deleteStation(id, setVisible, router);
  }

  /**
  * Effect: Pulls contact info data from firestore
  */
  public async fetchContactInfo(setContactInfo:Dispatch<SetStateAction<ContactInfo[]>>) {
    await DatabaseService.settingsService.fetchContactInfo(setContactInfo);
  }

  /**
  * Effect: Updates firestore with new contact info
  */
  public async updateContactInfo(
    contactInfo:ContactInfo[],
    hasChanged:boolean) {
    await DatabaseService.settingsService.updateContactInfo(contactInfo, hasChanged);
  }

  /**
  * Effect: Updates firestore with new contact info with extra steps
  */
  public async handleTextChange(
    index: number, 
    field: 'name' | 'email', 
    newText: string,
    contactInfo:ContactInfo[],
    setContactInfo:Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged:Dispatch<SetStateAction<boolean>>) {
    await DatabaseService.settingsService.handleTextChange(index, field, newText, contactInfo, setContactInfo, setHasChanged);
  }

  /**
   * Effect: Adds a contact and creates a new firestore document
   */
  public async addContact(
    contactInfo:ContactInfo[],
    setContactInfo:Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged:Dispatch<SetStateAction<boolean>>) {
    await DatabaseService.settingsService.addContact(contactInfo, setContactInfo, setHasChanged);
  }

  /**
  * Effect: Deletes a contact and removes it from firestore
  */
  public async deleteContact(
    index: number, 
    contactInfo:ContactInfo[],
    setContactInfo:Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged:Dispatch<SetStateAction<boolean>>) {
    await DatabaseService.settingsService.deleteContact(index, contactInfo, setContactInfo, setHasChanged);
  }

  /**
  * Effect: deletes a user from the firestore
  */
  public async handleDeleteUser(
    user:User,
  ) {
    await DatabaseService.settingsService.handleDeleteUser(user);
  }

  /**
   * Effect: promotes a user's role if capable
   */
  public async handlePromoteUser(thisUser:User) {
    await DatabaseService.settingsService.handlePromoteUser(thisUser);
  }

  /**
   * Effect: demotes a user's role if capable
   */
  public async handleDemoteUser(thisUser:User) {
    await DatabaseService.settingsService.handleDemoteUser(thisUser);
  } 

  /**
   * Effect: Pulls list of users from firestore
   */
  public async fetchUsers(setUsers:Dispatch<SetStateAction<User[]>>) {
    await DatabaseService.settingsService.fetchUsers(setUsers);
  }

  /**
   * Effect: Pulls images from firestore storage, sets profile picture
   */
  public async fetchStationImages(
    profilePic: string,
    setProfile: Dispatch<SetStateAction<string>>) {
      await DatabaseService.stationsService.fetchStationImages(profilePic, setProfile);
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