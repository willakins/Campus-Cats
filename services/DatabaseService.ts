import { getDownloadURL, ref } from 'firebase/storage';
import { getDocs, getDoc, updateDoc, doc, collection, query, where, DocumentData, getFirestore } from 'firebase/firestore';
import { auth, db, storage } from '@/config/firebase';
import { ContactInfo, User, WhitelistApp } from '@/types';
import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { Router } from 'expo-router';
import SettingsService from './SettingsService';

//Singleton class
class DatabaseService {
  private static instance: DatabaseService;
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
    user:User, router:Router
  ) {
    await DatabaseService.settingsService.handleDeleteUser(user, router);
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
  public async fetchUsers(setUsers:Dispatch<SetStateAction<User[]>>, id:string) {
    await DatabaseService.settingsService.fetchUsers(setUsers, id);
  }


  /**
   * Effect: Submits a whitelist application to the firestore
   */
  public async submitWhitelist(
    app:WhitelistApp,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router:Router
  ) {
    await DatabaseService.settingsService.submitWhitelist(app, setVisible, router)
  }

  /**
   * Effect: retrieves the whitelist application list from database
   */
  public async fetchWhitelist(setWhitelist: Dispatch<SetStateAction<WhitelistApp[]>>) {
    await DatabaseService.settingsService.fetchWhitelist(setWhitelist);
  }

  /**
   * Effect: Accepts or denies a whitelist applicaton
   */
  public async whitelistDecide(
    app:WhitelistApp, 
    decision:string,
    setApps:Dispatch<SetStateAction<WhitelistApp[]>>, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
    await DatabaseService.settingsService.whitelistDecide(app, decision, setApps, setVisible);
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
