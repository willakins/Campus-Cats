// TODO: Use proper types
/* eslint @typescript-eslint/no-unsafe-argument: 0 */
/* eslint @typescript-eslint/no-unsafe-assignment: 0 */
/* eslint @typescript-eslint/no-unsafe-member-access: 0 */
/* eslint @typescript-eslint/no-unsafe-return: 0 */
import { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';

import { Router } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { app, db } from '@/config/firebase';
import { ContactInfo, User, WhitelistApp } from '@/types';

//Wrapper class for settings database funcitonality
class SettingsService {
  /**
   * Effect: Pulls contact info data from firestore
   */
  public async fetchContactInfo(
    setContactInfo: Dispatch<SetStateAction<ContactInfo[]>>,
  ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'contact-info'));
      const data: ContactInfo[] = querySnapshot.docs.map((document) => ({
        id: document.id,
        name: document.data().name,
        email: document.data().email,
      }));
      setContactInfo(data);
    } catch (error) {
      console.error('Error fetching contact info:', error);
    }
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
    // Update the local state first
    const updatedContactInfo = [...contactInfo];
    updatedContactInfo[index] = {
      ...updatedContactInfo[index],
      [field]: newText,
    };
    setContactInfo(updatedContactInfo);
    setHasChanged(true);
  }

  /**
   * Effect: Updates firestore with new contact info
   */
  public async updateContactInfo(
    contactInfo: ContactInfo[],
    hasChanged: boolean,
  ) {
    if (hasChanged) {
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
  }

  /**
   * Effect: Adds a contact and creates a new firestore document
   */
  public async addContact(
    contactInfo: ContactInfo[],
    setContactInfo: Dispatch<SetStateAction<ContactInfo[]>>,
    setHasChanged: Dispatch<SetStateAction<boolean>>,
  ) {
    try {
      const docRef = await addDoc(collection(db, 'contact-info'), {
        name: '',
        email: '',
      });

      const newContact: ContactInfo = new ContactInfo(docRef.id, '', '');
      setContactInfo([...contactInfo, newContact]);
      setHasChanged(true);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
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
  }

  /**
   * Effect: deletes a user from the firestore
   */
  public handleDeleteUser(user: User, router: Router) {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.id));
              Alert.alert('User Deleted', `${user.email} has been removed.`);
              router.navigate('/settings/manage_users');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Could not delete user.');
            }
          },
        },
      ],
    );
  }

  /**
   * Effect: promotes a user's role if capable
   */
  public async handlePromoteUser(thisUser: User) {
    try {
      thisUser.role = Math.min(thisUser.role + 1, 2);
      const userRef = doc(db, 'users', thisUser.id);
      await updateDoc(userRef, {
        role: thisUser.role,
      });
      console.log(`User ${thisUser.id} has been promoted to role 1.`);
    } catch (error) {
      console.error('Error promoting user:', error);
    }
  }

  /**
   * Effect: Pulls list of users from firestore
   */
  public async fetchUsers(
    setUsers: Dispatch<SetStateAction<User[]>>,
    currentUserId: string,
  ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs
        .map((document) => ({
          id: document.id,
          email: document.data().email,
          role: document.data().role,
        }))
        .filter((user) => user.id !== currentUserId);

      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  /**
   * Effect: demotes a user's role if capable
   */
  public async handleDemoteUser(thisUser: User) {
    try {
      thisUser.role = Math.max(thisUser.role - 1, 0);
      const userRef = doc(db, 'users', thisUser.id);
      await updateDoc(userRef, {
        role: thisUser.role,
      });
      console.log(`User ${thisUser.id} has been promoted to role 1.`);
    } catch (error) {
      console.error('Error promoting user:', error);
    }
  }

  /**
   * Effect: Sends a whitelist application to the database
   */
  public async submitWhitelist(
    application: WhitelistApp,
    setVisible: Dispatch<SetStateAction<boolean>>,
    router: Router,
  ) {
    try {
      setVisible(true);
      const error_message = this.validateInput(application);

      if (error_message === '') {
        // Check if the user's email already exists in the whitelist collection
        const q = query(
          collection(db, 'whitelist'),
          where('email', '==', application.email),
        );
        const querySnapshot = await getDocs(q);

        // If an application already exists with the same email, alert the user
        if (!querySnapshot.empty) {
          alert(
            'You have already submitted an application. You cannot submit multiple applications.',
          );
          return;
        }

        // If no existing application, proceed to add the new one
        await addDoc(collection(db, 'whitelist'), {
          name: application.name,
          graduationYear: application.graduationYear,
          email: application.email,
          codeWord: application.codeWord,
        });

        alert(
          'Submitted! An officer will review your application. If accepted, you will receive an email, check your spam.',
        );
        router.push('/login');
      } else {
        alert(error_message);
      }
    } catch (error) {
      alert(
        'An error occurred while submitting your application. Please try again later.',
      );
      console.error(error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Effect: retrieves the whitelist application list from database
   */
  public async fetchWhitelist(
    setWhitelist: Dispatch<SetStateAction<WhitelistApp[]>>,
  ) {
    try {
      const querySnapshot = await getDocs(collection(db, 'whitelist'));
      const whitelist: WhitelistApp[] = querySnapshot.docs.map((document) => ({
        id: document.id,
        name: document.data().name,
        graduationYear: document.data().graduationYear,
        email: document.data().email,
        codeWord: document.data().codeWord,
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
    application: WhitelistApp,
    decision: string,
    setApps: Dispatch<SetStateAction<WhitelistApp[]>>,
    setVisible: Dispatch<SetStateAction<boolean>>,
  ) {
    try {
      setVisible(true);
      if (decision === 'accept') {
        const password = this.generatePassword(10);
        const functions = getFunctions(app);

        const sendWhitelistEmail = httpsCallable(
          functions,
          'sendWhitelistEmail',
        );
        const createWhitelistUser = httpsCallable(
          functions,
          'createWhitelistUser',
        );

        await sendWhitelistEmail({
          email: application.email,
          password: password,
        });

        await createWhitelistUser({
          email: application.email,
          password: password,
        });
      }
      const appRef = doc(db, 'whitelist', application.id);
      await deleteDoc(appRef);
      setApps((prevApps) => prevApps.filter((a) => a.id !== application.id));
    } catch (error) {
      alert(error);
    } finally {
      setVisible(false);
    }
  }

  /**
   * Private 1
   */
  private validateInput(application: WhitelistApp) {
    const requiredFields: { key: keyof WhitelistApp; label: string }[] = [
      { key: 'name', label: 'Name' },
      { key: 'graduationYear', label: 'Graduation Year' },
      { key: 'email', label: 'Email' },
    ];

    for (const field of requiredFields) {
      const value = application[field.key];
      if (!value || !value.trim()) {
        return `${field.label} field must not be empty`;
      }
    }
    return '';
  }

  /**
   * Private 2
   */
  private generatePassword(length: number) {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomChar = charset.charAt(
        Math.floor(Math.random() * charset.length),
      );
      password += randomChar;
    }
    return password;
  }
}
export default SettingsService;
