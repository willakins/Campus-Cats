import { db, storage } from "@/config/firebase";
import { CatalogEntryObject, CatSightingObject, User } from "@/types";
import { Router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, getStorage, listAll, ref, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";

//Wrapper class for catalog database funcitonality
class CatalogService {

    public constructor() {}

    // Overload signatures
    public async fetchCatImages(
        id: string,
        setProfile: Dispatch<SetStateAction<string>>
    ): Promise<void>;

    public async fetchCatImages(
        id: string,
        setProfile: Dispatch<SetStateAction<string>>,
        setImageUrls: Dispatch<SetStateAction<string[]>>
    ): Promise<void>;

    /**
     * Implementation that handles both overloads
     * Effect: Pulls images from firestore storage, sets profile picture, sets extra images if applicable
     */
    public async fetchCatImages(
        id: string,
        setProfile: Dispatch<SetStateAction<string>>,
        setImageUrls?: Dispatch<SetStateAction<string[]>>
    ): Promise<void> {
        try {
        const folderRef = ref(storage, `catalog/${id}/`);
        const result = await listAll(folderRef);
        let extraPicUrls: string[] = [];

        for (const itemRef of result.items) {
            const url = await getDownloadURL(itemRef);
            if (itemRef.name.includes('profile')) {
              setProfile(url);
            } else {
              extraPicUrls.push(url);
            }
        }
        if (setImageUrls) {
          setImageUrls(extraPicUrls);
        }
        } catch (error) {
        console.error('Error fetching images: ', error);
        }
    }

    /**
     * Effect: Pulls catalog documents from firestore
     */
    public async fetchCatalogData(setCatalogEntries:Dispatch<SetStateAction<CatalogEntryObject[]>> ) {
        try {
            const querySnapshot = await getDocs(collection(db, 'catalog'));
            const entries: CatalogEntryObject[] = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              name: doc.data().name,
              descShort: doc.data().descShort,
              descLong: doc.data().descLong,
              colorPattern: doc.data().colorPattern,
              behavior: doc.data().behavior,
              yearsRecorded: doc.data().yearsRecorded,
              AoR: doc.data().AoR,
              currentStatus: doc.data().currentStatus,
              furLength: doc.data().furLength,
              furPattern: doc.data().furPattern,
              tnr: doc.data().tnr,
              sex: doc.data().sex,
              credits: doc.data().credits,
            }));
            setCatalogEntries(entries);
        } catch (error) {
            console.error('Error fetching catalog data: ', error);
        }
    };

    /**
    * Effect: Updates firestore and storage when editing a catalog entry
    */
    public async handleCatalogSave(
      thisEntry: CatalogEntryObject,
      newPics: { url: string; name: string; }[], 
      newPhotosAdded: boolean, 
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router) {
        try {
          const error_message = this.validateInput(thisEntry, '', 'save');
          if (error_message == "") {
            setVisible(true);
            // Reference to the Firestore document using its ID
            const catDocRef = doc(db, 'catalog', thisEntry.id);
      
            // Update the 'name' field in Firestore
            await updateDoc(catDocRef, { 
              id: thisEntry.id,
              name: thisEntry.name,
              descShort: thisEntry.descShort,
              descLong: thisEntry.descLong,
              colorPattern: thisEntry.colorPattern,
              behavior: thisEntry.behavior,
              yearsRecorded: thisEntry.yearsRecorded,
              AoR: thisEntry.AoR,
              currentStatus: thisEntry.currentStatus,
              furLength: thisEntry.furLength,
              furPattern: thisEntry.furPattern,
              tnr: thisEntry.tnr,
              sex: thisEntry.sex,
              credits: thisEntry.credits,
            });
            if (newPhotosAdded) {
              const folderPath = `catalog/${thisEntry.id}/`; // Path in Firebase Storage
              const folderRef = ref(storage, folderPath);
      
              // Step 3: Upload only new photos
              for (const pic of newPics) {
                const response = await fetch(pic.url);
                const blob = await response.blob();
                const existingFilesSnapshot = await listAll(folderRef);
                const existingFiles = existingFilesSnapshot.items.map((item) => item.name);
      
                const unique_name = this.generateUniqueFileName(existingFiles, thisEntry.name)
                const photoRef = ref(storage, `${folderPath}${unique_name}`);
                await uploadBytes(photoRef, blob);
              }
            }
            router.push({
              pathname: '/catalog/view-entry', 
              params: { id:thisEntry.id, name:thisEntry.name, descShort:thisEntry.descShort, descLong:thisEntry.descLong, colorPattern:thisEntry.colorPattern, 
                behavior:thisEntry.behavior, yearsRecorded:thisEntry.yearsRecorded, AoR:thisEntry.AoR, currentStatus:thisEntry.currentStatus, 
                furLength:thisEntry.furLength, furPattern:thisEntry.furPattern, tnr:thisEntry.tnr, sex:thisEntry.sex, credits:thisEntry.credits}, })
          } else {
            Alert.alert(error_message);
          }
        } catch (error) {
          console.error('Error updating name:', error);
          alert('Error Failed to update name.');
        } finally {
          setVisible(false);
        }
    };
    
    /**
     * 
     */
    public async handleCatalogCreate(
      thisEntry: CatalogEntryObject,
      profilePic: string, 
      user: User,
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router) {
        try {
          const error_message = this.validateInput(thisEntry, profilePic, 'create');
          if (error_message == "") {
            setVisible(true);
            const docRef = await addDoc(collection(db, 'catalog'), {
              name: thisEntry.name,
              descShort: thisEntry.descShort,
              descLong: thisEntry.descLong,
              colorPattern: thisEntry.colorPattern,
              behavior: thisEntry.behavior,
              yearsRecorded: thisEntry.yearsRecorded,
              AoR: thisEntry.AoR,
              currentStatus: thisEntry.currentStatus,
              furLength: thisEntry.furLength,
              furPattern: thisEntry.furPattern,
              tnr: thisEntry.tnr,
              sex: thisEntry.sex,
              credits: thisEntry.credits,
              createdAt: new Date(),
              createdBy: user,
            });
            if (profilePic) {
              const response = await fetch(profilePic);
              const blob = await response.blob();
              const imageRef = ref(getStorage(), `catalog/${docRef.id}/profile.jpg`);
              await uploadBytes(imageRef, blob);
            
            }
            Alert.alert('Success', 'Cat entry created successfully!');
            router.back();
          } else {
            Alert.alert(error_message)
          }
        } catch (error) {
          console.error('Error creating catalog entry:', error);
          Alert.alert('Error', 'Failed to create cat entry.');
        } finally {
          setVisible(false);
        }
    };

    /**
    * Effect: Swaps the profile picture for a catalog entry
    */
    public async swapProfilePicture(
      id:string, 
      picUrl:string, 
      picName:string, 
      profilePicUrl?:string) {
      const folderRef = ref(storage, `catalog/${id}`);
      const listResult = await listAll(folderRef);
      
      // Find the profile picture regardless of extension
      const profileFile = listResult.items.find((item) => {
        const name = item.name.toLowerCase();
        return name.startsWith("profile.") || name === "profile";
      });
      
      const selectedPicRef = ref(storage, `catalog/${id}/${picName}`);
  
      // Fetch image blobs
      const oldProfileBlob = await (await fetch(profilePicUrl!)).blob();
      const selectedPicBlob = await (await fetch(picUrl)).blob();
  
      // Swap images:
      // 1. Delete both files
      if (profileFile) {
        await deleteObject(profileFile);
      }
      await deleteObject(selectedPicRef);
  
      // 2. Re-upload old profile picture as selectedPic.name
      const newExtraPicRef = ref(storage, `catalog/${id}/${picName}`);
      await uploadBytesResumable(newExtraPicRef, oldProfileBlob);
  
      // 3. Re-upload selected picture as profile picture
      const newProfilePicRef = ref(storage, `catalog/${id}/profile.jpg`);
      await uploadBytesResumable(newProfilePicRef, selectedPicBlob);
    }

    /**
    * Effect: deletes a picture from a catalog entry
    */
    public async deleteCatalogPicture(
        id:string, 
        picName: string, 
        setProfile: Dispatch<SetStateAction<string>>,
        setImageUrls: Dispatch<SetStateAction<string[]>>) {
        try {
            const imageRef = ref(storage, `catalog/${id}/${picName}`);
            await deleteObject(imageRef);
            this.fetchCatImages(id, setProfile, setImageUrls);
    
            alert('Success Image deleted successfully!');
        } catch (error) {
            alert('Error Failed to delete the image.');
            console.error('Error deleting image: ', error);
        }
    };

    /**
    * Effect: Deletes an existing catalog entry from firebase
    */
    public async deleteCatalogEntry(
      id: string, 
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router,
    ) {
      Alert.alert(
        'Select Option',
        'Are you sure you want to delete this Catalog entry forever?',
        [
          {
            text: 'Delete Forever',
            onPress: async () => await this.confirmDeleteCatalogEntry(id, setVisible, router),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    }
    /**
     * Private 1
     */
    private async confirmDeleteCatalogEntry(
      id: string, 
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router) {
      try {
        setVisible(true);
        await deleteDoc(doc(db, 'catalog', id)); //Delete firestore document

        //Delete storage folder
        const photoPath = `catalog/${id}`;
        const folderRef = ref(storage, photoPath);
        const result = await listAll(folderRef);
        await Promise.all(result.items.map((item) => deleteObject(item)));
    
        alert('Entry deleted successfully!');
        router.navigate('/catalog');
        
      } catch (error) {
        alert(error);
      } finally {
        setVisible(false);
      }
    }

    /**
    * Private 1
    */
    private generateUniqueFileName(existingFiles: string[], originalName: string) {
        let fileNameBase = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
        let newFileName: string;

        do {
            let randomInt = Math.floor(Math.random() * 10000); // Generate random number (0-9999)
            newFileName = `${fileNameBase}_${randomInt}.jpg`;
        } while (existingFiles.includes(newFileName)); // Ensure it's unique

        return newFileName;
    }

    /**
     * Private 2
     */
    private validateInput(thisEntry:CatalogEntryObject, profilePic:string, type:string) {
      const requiredFields = [
        { key: 'name', label: 'Name' },
        { key: 'descShort', label: 'Short Description' },
        { key: 'descLong', label: 'Long Description' },
        { key: 'colorPattern', label: 'Color pattern' },
        { key: 'yearsRecorded', label: 'Years recorded' },
        { key: 'AoR', label: 'Area of residence' },
        { key: 'currentStatus', label: 'Current status' },
        { key: 'furLength', label: 'Fur length' },
        { key: 'furPattern', label: 'Fur pattern' },
        { key: 'tnr', label: 'TNR status' },
        { key: 'sex', label: 'Sex' },
      ];
    
      for (const field of requiredFields) {
        const value = (thisEntry as any)[field.key];
        if (!value || !value.trim()) {
          return `${field.label} field must not be empty`;
        }
      }

      if (type == 'create' && (!profilePic || !profilePic.trim())) {
        return 'Please upload a profile photo of the cat.'
      }
    
      return "";
    }
}
export default CatalogService;