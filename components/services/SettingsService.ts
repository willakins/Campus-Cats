import { auth, db } from "@/config/firebase";
import { ContactInfo, User, WhitelistApp } from "@/types";
import { Router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

//Wrapper class for settings database funcitonality
class SettingsService {

  public constructor() {}

  /**
   * Effect: Pulls contact info data from firestore
   */
  public async fetchContactInfo(
      setContactInfo:Dispatch<SetStateAction<ContactInfo[]>>) {
      try {
        const querySnapshot = await getDocs(collection(db, 'contact-info'));
        const data: ContactInfo[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
        }));
        setContactInfo(data);
      } catch (error) {
        console.error('Error fetching contact info:', error);
      }
  };
      
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
      // Update the local state first
      const updatedContactInfo = [...contactInfo];
      updatedContactInfo[index] = {
        ...updatedContactInfo[index],
        [field]: newText,
      };
      setContactInfo(updatedContactInfo);
      setHasChanged(true);
  };

  /**
  * Effect: Updates firestore with new contact info
  */
  public async updateContactInfo(
    contactInfo:ContactInfo[],
    hasChanged:boolean) {
    if(hasChanged){
      try {
        for (let i = 0; i < contactInfo.length; i++) {
          const contactDocRef = doc(db, 'contact-info', contactInfo[i].id);
          await updateDoc(contactDocRef, {
            name: contactInfo[i].name,
            email: contactInfo[i].email,
          });
        }
        alert('Contact info updated successfully!');
      } catch (error) {
        console.error('Error updating contact info:', error);
        alert('Failed to update contact info.');
      }
    }
  };

  /**
   * Effect: Adds a contact and creates a new firestore document
   */
  public async addContact(
    contactInfo:ContactInfo[],
    setContactInfo:Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged:Dispatch<SetStateAction<boolean>>) {
    try {
      const docRef = await addDoc(collection(db, 'contact-info'), {
        name: '',
        email: '',
      });

      const newContact: ContactInfo = new ContactInfo(docRef.id, '', '' );
      setContactInfo([...contactInfo, newContact]);
      setHasChanged(true);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  /**
   * Effect: Deletes a contact and removes it from firestore
   */
  public async deleteContact(
    index: number, 
    contactInfo:ContactInfo[],
    setContactInfo:Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged:Dispatch<SetStateAction<boolean>>) {
    try {
      const id = contactInfo[index].id;
      await deleteDoc(doc(db, 'contact-info', id));

      const updatedContacts = [...contactInfo];
      updatedContacts.splice(index, 1);
      setContactInfo(updatedContacts);
      setHasChanged(true);
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  /**
   * Effect: deletes a user from the firestore
   */
  public async handleDeleteUser(
    user:User,
  ) {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", user.id));
              Alert.alert("User Deleted", `${user.email} has been removed.`);
            } catch (error) {
              console.error("Error deleting user:", error);
              Alert.alert("Error", "Could not delete user.");
            }
          }
        }
      ]
    );
  };

  /**
   * Effect: promotes a user's role if capable
   */
  public async handlePromoteUser(thisUser:User) {
    try {
      thisUser.role += 1;
      const userRef = doc(db, "users", thisUser.id);
      await updateDoc(userRef, {
        role: thisUser.role
      });
      console.log(`User ${thisUser.id} has been promoted to role 1.`);
    } catch (error) {
      console.error("Error promoting user:", error);
    }
  }

  /**
   * Effect: Pulls list of users from firestore
   */
  public async fetchUsers(setUsers:Dispatch<SetStateAction<User[]>>) {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        role: doc.data().role,
      }));
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  /**
   * Effect: demotes a user's role if capable
   */
  public async handleDemoteUser(thisUser:User) {
    try {
      thisUser.role -= 1;
      const userRef = doc(db, "users", thisUser.id);
      await updateDoc(userRef, {
        role: thisUser.role
      });
      console.log(`User ${thisUser.id} has been promoted to role 1.`);
    } catch (error) {
      console.error("Error promoting user:", error);
    }
  }

  /**
   * Effect: Sends a whitelist application to the database
   */
  public async submitWhitelist(app:WhitelistApp, setVisible:Dispatch<SetStateAction<boolean>>, router:Router) {
    try {
      setVisible(true);
      const error_message = this.validateInput(app);
      if (error_message == "") {
        const docRef = await addDoc(collection(db, 'whitelist'), {
            name: app.name,
            graduationYear: app.graduationYear,
            email: app.email,
            codeWord: app.codeWord
          });
          router.push('/login')
      } else {
        alert(error_message);
      }
    } catch (error) {
      alert(error)
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: retrieves the whitelist application list from database
   */
  public async fetchWhitelist(setWhitelist: Dispatch<SetStateAction<WhitelistApp[]>>) {
    try {
      const querySnapshot = await getDocs(collection(db, 'whitelist'));
      const whitelist: WhitelistApp[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        graduationYear: doc.data().graduationYear,
        email: doc.data().email,
        codeWord: doc.data().codeWord
      }));
      setWhitelist(whitelist);
    } catch (error) {
      alert(error);
    }
  } 

  /**
   * Effect: Accepts or denies a whitelist applicaton
   */
  public async whitelistDecide(
    app:WhitelistApp, 
    decision:string,
    setApps:Dispatch<SetStateAction<WhitelistApp[]>>, 
    setVisible:Dispatch<SetStateAction<boolean>>) {
    try {
      setVisible(true);
      if (decision == 'accept') {
        const password = this.generatePassword(10);
        const functions = getFunctions();
        const sendWhitelistEmail = httpsCallable(functions, 'sendWhitelistEmail');
        await sendWhitelistEmail({
          email: app.email,
          password: password
        });
        //TODO prevent sign in of new user (probably sign out and sign back in with current user)
        const userCredential = await createUserWithEmailAndPassword(auth, app.email, password);
        const authUser = userCredential.user;
        await addDoc(collection(db, 'users'), {
          email:app.email,
          role: 0
        });
      }
      const appRef = doc(db, "whitelist", app.id);
      await deleteDoc(appRef);
      setApps((prevApps) => prevApps.filter((a) => a.id !== app.id));
    } catch (error) {
      alert(error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * try {
          
        } catch (error) {}
   */

  /**
   * Private 1
   */
  private validateInput(app:WhitelistApp) {
    const requiredFields = [
      { key: 'name', label: 'Name' },
      { key: 'graduationYear', label: 'Graduation Year' },
      { key: 'email', label: 'Email' },
    ];
  
    for (const field of requiredFields) {
      const value = (app as any)[field.key];
      if (!value || !value.trim()) {
        return `${field.label} field must not be empty`;
      }
    }
    return "";
  }

  /**
   * Private 2
   */
  private generatePassword(length:number) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomChar = charset.charAt(Math.floor(Math.random() * charset.length));
      password += randomChar;
    }
    return password;
  }
}
export default SettingsService;
