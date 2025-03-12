import { db } from "@/config/firebase";
import { ContactInfo } from "@/types";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { Dispatch, SetStateAction } from "react";

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
}
export default SettingsService;
