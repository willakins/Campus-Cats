import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';

import { Router } from 'expo-router';
import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

import { auth, db, storage } from '@/config/firebase';
import {
  Announcement,
  CatalogEntry,
  ContactInfo,
  Sighting,
  Station,
  User,
  WhitelistApp,
} from '@/types';

import AnnouncementsService from './AnnouncementsService';
import CatalogService from './CatalogService';
import SettingsService from './SettingsService';
import SightingsService from './SightingsService';
import StationsService from './StationsService';

//Singleton class
class DatabaseService {
  private static instance: DatabaseService;
  private static catalogService: CatalogService = new CatalogService();
  private static announcementsService: AnnouncementsService =
    new AnnouncementsService();
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
    if (!(await this.isSuperAdmin(selfId))) {
      Alert.alert('You do not have permissions to create admins');
      return;
    }
    const [userId, userData] = (await this.queryEmail(user_email)) as [
      string,
      DocumentData,
    ];

    if (userId) {
      const userDocRef = doc(db, 'users', userId); // Reference to the user's document

      try {
        // Update the field in the user's document
        await updateDoc(userDocRef, {
          role: 1,
        });

        Alert.alert(userData.email + ' is now an admin!');
      } catch (error: unknown) {
        if (error instanceof Error) {
          Alert.alert(`Error updating field: ${error.message}`);
        } else {
          Alert.alert(`Unexpected error: ${String(error)}`);
        }
      }
    } else {
      Alert.alert('No user is logged in.');
    }
  }

  /**
   * Effect: Pulls cat sightings from firestore and stores them in Marker friendly format
   */
  public async fetchPins(
    setPins: Dispatch<SetStateAction<Sighting[]>>,
    setMapKey: Dispatch<SetStateAction<number>>,
  ) {
    await DatabaseService.sightingsService.fetchPins(setPins, setMapKey);
  }

  /**
   * Effect: pulls cat sightings from firestore
   */
  public async getSightings(
    name: string,
    setSightings: Dispatch<SetStateAction<Sighting[]>>,
  ) {
    await DatabaseService.sightingsService.getSightings(name, setSightings);
  }

  /**
   * Effect: updates firestore when editing a cat sighting
   */
  public async saveSighting(
    photos: string[],
    profile: string,
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.sightingsService.saveSighting(
      photos,
      profile,
      isPicsChanged,
      setVisible,
      router,
    );
  }

  /**
   * Effect: pulls sighting images from storage
   */
  public async fetchSightingImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setPhotos: Dispatch<SetStateAction<string[]>>,
  ) {
    await DatabaseService.sightingsService.fetchSightingImages(
      id,
      setProfile,
      setPhotos,
    );
  }

  /**
   * Effect: Submits a new cat sighting to firestore
   */
  public async createSighting(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.sightingsService.createSighting(
      photos,
      setVisible,
      router,
    );
  }

  /**
   * Effect: updates firestore when deleting a cat sighting
   */
  public deleteSighting(
    id: string,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    DatabaseService.sightingsService.deleteSighting(id, setVisible, router);
  }

  /**
   * Effect: Given a url, fetches the photo
   */
  public async fetchImage(
    photoUrl: string,
    setPhoto: Dispatch<SetStateAction<string>>,
  ) {
    if (photoUrl) {
      const url = await this.getImageUrl(photoUrl); // Get the image URL
      if (url) {
        setPhoto(url); // Update the state with the image URL
      }
    }
  }

  // Overload signatures
  public async fetchCatImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setImageUrls?: Dispatch<SetStateAction<string[]>>,
  ): Promise<void>;

  /**
   * Implementation that handles both overloads
   * Effect: Pulls images from firestore storage, sets profile picture, sets extra images if applicable
   */
  public async fetchCatImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setImageUrls?: Dispatch<SetStateAction<string[]>>,
  ): Promise<void> {
    if (setImageUrls) {
      await DatabaseService.catalogService.fetchCatImages(
        id,
        setProfile,
        setImageUrls,
      );
    } else {
      await DatabaseService.catalogService.fetchCatImages(id, setProfile);
    }
  }

  /**
   * Effect: Pulls catalog documents from firestore
   */
  public async fetchCatalogData(
    setCatalogEntries: Dispatch<SetStateAction<CatalogEntry[]>>,
  ) {
    await DatabaseService.catalogService.fetchCatalogData(setCatalogEntries);
  }

  /**
   * Effect: Updates firestore and storage when editing a catalog entry
   */
  public async handleCatalogSave(
    photos: string[],
    profile: string,
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.catalogService.handleCatalogSave(
      photos,
      profile,
      isPicsChanged,
      setVisible,
      router,
    );
  }

  /**
   * Effect: Creates a new catalog entry and stores it in firebase
   */
  public async handleCatalogCreate(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.catalogService.handleCatalogCreate(
      photos,
      setVisible,
      router,
    );
  }

  /**
   * Effect: Deletes an existing catalog entry from firebase
   */
  public deleteCatalogEntry(
    id: string,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    DatabaseService.catalogService.deleteCatalogEntry(id, setVisible, router);
  }

  /**
   * Effect: Swaps the profile picture for a catalog entry
   */
  public async swapProfilePicture(
    type: string,
    id: string,
    picUrl: string,
    picName: string,
    profilePicUrl?: string,
  ) {
    if (type === 'catalog') {
      await DatabaseService.catalogService.swapProfilePicture(
        id,
        picUrl,
        picName,
        profilePicUrl,
      );
    } else if (type === 'sightings') {
      await DatabaseService.sightingsService.swapProfilePicture(
        id,
        picUrl,
        picName,
        profilePicUrl,
      );
    } else if (type === 'stations') {
      await DatabaseService.stationsService.swapProfilePicture(
        id,
        picUrl,
        picName,
        profilePicUrl,
      );
    }
  }

  /**
   * Effect: deletes a picture from a catalog entry
   */
  public async deleteCatalogPicture(id: string, picName: string) {
    await DatabaseService.catalogService.deleteCatalogPicture(id, picName);
  }

  /**
   * Effect: deletes a picture from a catalog entry
   */
  public async deleteSightingPicture(id: string, picName: string) {
    await DatabaseService.sightingsService.deleteSightingPicture(id, picName);
  }

  /**
   * Effect: deletes a picture from a catalog entry
   */
  public async deleteStationPicture(id: string, picName: string) {
    await DatabaseService.stationsService.deleteSightingPicture(id, picName);
  }

  /**
   * Effect: pulls announcement data from firestore
   */
  public async fetchAnnouncementData(
    setAnns: Dispatch<SetStateAction<Announcement[]>>,
  ) {
    await DatabaseService.announcementsService.fetchAnnouncementData(setAnns);
  }

  /**
   * Effect: pulls announcement images from storage
   */
  public async fetchAnnouncementImages(
    id: string,
    setImageUrls: Dispatch<SetStateAction<string[]>>,
  ) {
    await DatabaseService.announcementsService.fetchAnnouncementImages(
      id,
      setImageUrls,
    );
  }

  /**
   * Effect: creates an announcement and stores it in firestore
   */
  public async handleAnnouncementCreate(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.announcementsService.handleAnnouncementCreate(
      photos,
      setVisible,
      router,
    );
  }

  /**
   * Effect: updates an existing announcement in firestore
   */
  public async handleAnnouncementSave(
    photos: string[],
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.announcementsService.handleAnnouncementSave(
      photos,
      isPicsChanged,
      setVisible,
      router,
    );
  }

  /**
   * Effect: Deletes an announcement from database
   */
  public async deleteAnnouncement(
    id: string,
    router: Router,
    setVisible: Dispatch<SetStateAction<boolean>>,
  ) {
    await DatabaseService.announcementsService.deleteAnnouncement(
      id,
      router,
      setVisible,
    );
  }

  /**
   * Effect: Gets all stations from firebase
   */
  public async fetchStations(
    setStationEntries: Dispatch<SetStateAction<Station[]>>,
  ) {
    await DatabaseService.stationsService.fetchStations(setStationEntries);
  }

  /**
   * Effect: Adds a new station to firebase
   */
  public async createStation(
    photos: string[],
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.stationsService.createStation(
      photos,
      setVisible,
      router,
    );
  }

  /**
   * Effect: Stocks a station
   */
  public async stockStation(
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.stationsService.stockStation(setVisible, router);
  }

  /**
   * TODO
   */
  public async saveStation(
    profile: string,
    photos: string[],
    isPicsChanged: boolean,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.stationsService.saveStation(
      profile,
      photos,
      isPicsChanged,
      setVisible,
      router,
    );
  }

  /**
   * TODO
   */
  public deleteStation(
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    DatabaseService.stationsService.deleteStation(setVisible, router);
  }

  /**
   * Effect: Pulls contact info data from firestore
   */
  public async fetchContactInfo(
    setContactInfo: Dispatch<SetStateAction<ContactInfo[]>>,
  ) {
    await DatabaseService.settingsService.fetchContactInfo(setContactInfo);
  }

  /**
   * Effect: Updates firestore with new contact info
   */
  public async updateContactInfo(
    contactInfo: ContactInfo[],
    hasChanged: boolean,
  ) {
    await DatabaseService.settingsService.updateContactInfo(
      contactInfo,
      hasChanged,
    );
  }

  /**
   * Effect: Updates firestore with new contact info with extra steps
   */
  public handleTextChange(
    index: number,
    field: 'name' | 'email',
    newText: string,
    contactInfo: ContactInfo[],
    setContactInfo: Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged: Dispatch<SetStateAction<boolean>>,
  ) {
    DatabaseService.settingsService.handleTextChange(
      index,
      field,
      newText,
      contactInfo,
      setContactInfo,
      setHasChanged,
    );
  }

  /**
   * Effect: Adds a contact and creates a new firestore document
   */
  public async addContact(
    contactInfo: ContactInfo[],
    setContactInfo: Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged: Dispatch<SetStateAction<boolean>>,
  ) {
    await DatabaseService.settingsService.addContact(
      contactInfo,
      setContactInfo,
      setHasChanged,
    );
  }

  /**
   * Effect: Deletes a contact and removes it from firestore
   */
  public async deleteContact(
    index: number,
    contactInfo: ContactInfo[],
    setContactInfo: Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged: Dispatch<SetStateAction<boolean>>,
  ) {
    await DatabaseService.settingsService.deleteContact(
      index,
      contactInfo,
      setContactInfo,
      setHasChanged,
    );
  }

  /**
   * Effect: deletes a user from the firestore
   */
  public handleDeleteUser(user: User, router: Router) {
    DatabaseService.settingsService.handleDeleteUser(user, router);
  }

  /**
   * Effect: promotes a user's role if capable
   */
  public async handlePromoteUser(thisUser: User) {
    await DatabaseService.settingsService.handlePromoteUser(thisUser);
  }

  /**
   * Effect: demotes a user's role if capable
   */
  public async handleDemoteUser(thisUser: User) {
    await DatabaseService.settingsService.handleDemoteUser(thisUser);
  }

  /**
   * Effect: Pulls list of users from firestore
   */
  public async fetchUsers(
    setUsers: Dispatch<SetStateAction<User[]>>,
    id: string,
  ) {
    await DatabaseService.settingsService.fetchUsers(setUsers, id);
  }

  /**
   * Effect: Loads station images from firestore storage
   */
  public async fetchStationImages(
    id: string,
    setProfile: Dispatch<SetStateAction<string>>,
    setPhotos: Dispatch<SetStateAction<string[]>>,
  ) {
    await DatabaseService.stationsService.fetchStationImages(
      id,
      setProfile,
      setPhotos,
    );
  }

  /**
   * Effect: Submits a whitelist application to the firestore
   */
  public async submitWhitelist(
    app: WhitelistApp,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    await DatabaseService.settingsService.submitWhitelist(
      app,
      setVisible,
      router,
    );
  }

  /**
   * Effect: retrieves the whitelist application list from database
   */
  public async fetchWhitelist(
    setWhitelist: Dispatch<SetStateAction<WhitelistApp[]>>,
  ) {
    await DatabaseService.settingsService.fetchWhitelist(setWhitelist);
  }

  /**
   * Effect: Accepts or denies a whitelist applicaton
   */
  public async whitelistDecide(
    app: WhitelistApp,
    decision: string,
    setApps: Dispatch<SetStateAction<WhitelistApp[]>>,
    setVisible: Dispatch<SetStateAction<boolean>>,
  ) {
    await DatabaseService.settingsService.whitelistDecide(
      app,
      decision,
      setApps,
      setVisible,
    );
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
  private async isSuperAdmin(selfId: string) {
    if (selfId) {
      const selfDocRef = doc(db, 'users', selfId); // Reference to the user's document

      try {
        // Update the field in the user's document
        const selfData = await getDoc(selfDocRef);
        // NOTE: We don't do type checking, so use type coercion here
        // eslint-disable-next-line eqeqeq
        return selfData.data()?.role == 2;
      } catch (error: unknown) {
        if (error instanceof Error) {
          Alert.alert(`Error getting field: ${error.message}`);
        } else {
          Alert.alert(`Unexpected error: ${String(error)}`);
        }
      }
    }
    return false;
  }

  /**
   * Private 2
   */
  private async queryEmail(user_email: string) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', user_email));
    const querySnapshot = await getDocs(q);
    return [querySnapshot.docs[0].id, querySnapshot.docs[0].data()];
  }

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
  }

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
