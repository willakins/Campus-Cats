import { db, storage } from "@/config/firebase";
import { CatalogEntryObject, CatSightingObject } from "@/types";
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
        try {
        const folderRef = ref(storage, `cats/${catName}/`);
        const result = await listAll(folderRef);
        let extraPicUrls: string[] = [];

        for (const itemRef of result.items) {
            const url = await getDownloadURL(itemRef);
            if (itemRef.name.includes('_profile')) {
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
            name: doc.data().catName,
            info: doc.data().info,
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
      catName: string, 
      oldName: string, 
      info: string, 
      newPics: { url: string; name: string; }[], 
      newPhotosAdded: boolean, 
      id: string, 
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router) {
        if (!catName.trim()) {
          alert('Invalid Name Cat name cannot be empty.');
          return;
        }
        try {
          setVisible(true);
          // Reference to the Firestore document using its ID
          const catDocRef = doc(db, 'catalog', id);
    
          // Update the 'name' field in Firestore
          await updateDoc(catDocRef, { 
            catName: catName,
            info: info
          });
          if (oldName !== catName) {
            const oldFolderRef = ref(storage, `cats/${oldName}`);
            const oldPhotos = await listAll(oldFolderRef);
    
            for (const item of oldPhotos.items) {
              const oldPath = item.fullPath; // Full path of old image
              const newPath = oldPath.replace(`cats/${oldName}`, `cats/${catName}`); // New path
    
              // Download old image data
              const url = await getDownloadURL(item);
              const response = await fetch(url);
              const blob = await response.blob();
    
              // Upload to new location
              const newImageRef = ref(storage, newPath);
              await uploadBytes(newImageRef, blob);
    
              // Delete old image
              await deleteObject(item);
            }
          }
          if (newPhotosAdded) {
            const folderPath = `cats/${catName}/`; // Path in Firebase Storage
            const folderRef = ref(storage, folderPath);
    
            // Step 3: Upload only new photos
            for (const pic of newPics) {
              const response = await fetch(pic.url);
              const blob = await response.blob();
              const existingFilesSnapshot = await listAll(folderRef);
              const existingFiles = existingFilesSnapshot.items.map((item) => item.name);
    
              const unique_name = this.generateUniqueFileName(existingFiles, catName)
              const photoRef = ref(storage, `${folderPath}${unique_name}`);
              await uploadBytes(photoRef, blob);
            }
          }
        } catch (error) {
          console.error('Error updating name:', error);
          alert('Error Failed to update name.');
        } finally {
          setVisible(false);
          router.push({
            pathname: '/catalog/view-entry', // Dynamically navigate to the details page
            params: { paramId:id, paramName:catName, paramInfo:info}, // Pass the details as query params
          })
        }
    };
    
    /**
     * 
     */
    public async handleCatalogCreate(
      catName: string, 
      info: string, 
      profilePic: string, 
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router) {
        if (!catName.trim()) {
          Alert.alert('Invalid Name', 'Cat name cannot be empty.');
          return;
        }
        try {
          setVisible(true);
          let profilePicUrl = '';
    
          if (profilePic) {
            const response = await fetch(profilePic);
            const blob = await response.blob();
            const imageRef = ref(getStorage(), `cats/${catName}/${catName}_profile.jpg`);
            await uploadBytes(imageRef, blob);
           
          }
    
          await addDoc(collection(db, 'catalog'), {
            catName,
            info,
            createdAt: new Date(),
          });
    
          Alert.alert('Success', 'Cat entry created successfully!');
        } catch (error) {
          console.error('Error creating catalog entry:', error);
          Alert.alert('Error', 'Failed to create cat entry.');
        } finally {
          setVisible(false);
          router.back();
        }
    };

    /**
    * Effect: Swaps the profile picture for a catalog entry
    */
    public async swapProfilePicture(
        catName:string, 
        picUrl:string, 
        picName:string, 
        profilePicUrl?:string, 
        profilePicName?:string) {
        const oldProfileRef = ref(storage, `cats/${catName}/${profilePicName}`);
        const selectedPicRef = ref(storage, `cats/${catName}/${picName}`);
    
        // Fetch image blobs
        const oldProfileBlob = await (await fetch(profilePicUrl!)).blob();
        const selectedPicBlob = await (await fetch(picUrl)).blob();
    
        // Swap images:
        // 1. Delete both files
        await deleteObject(oldProfileRef);
        await deleteObject(selectedPicRef);
    
        // 2. Re-upload old profile picture as selectedPic.name
        const newExtraPicRef = ref(storage, `cats/${catName}/${picName}`);
        await uploadBytesResumable(newExtraPicRef, oldProfileBlob);
    
        // 3. Re-upload selected picture as profile picture
        const newProfilePicRef = ref(storage, `cats/${catName}/${catName}_profile.jpg`);
        await uploadBytesResumable(newProfilePicRef, selectedPicBlob);
    }

    /**
    * Effect: deletes a picture from a catalog entry
    */
    public async deleteCatalogPicture(
        catName:string, 
        picName: string, 
        setProfile: Dispatch<SetStateAction<string>>,
        setImageUrls: Dispatch<SetStateAction<string[]>>) {
        try {
            const imageRef = ref(storage, `cats/${catName}/${picName}`);
            await deleteObject(imageRef);
            this.fetchCatImages(catName, setProfile, setImageUrls);
    
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
      catName: string, 
      id: string, 
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router,
    ) {
      Alert.alert(
        'Select Option',
        'Are you sure you want to delete this image forever?',
        [
          {
            text: 'Delete Forever',
            onPress: async () => await this.confirmDeleteCatalogEntry(catName, id, setVisible, router),
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
      catName: string, 
      id: string, 
      setVisible: Dispatch<SetStateAction<boolean>>, 
      router: Router) {
      try {
        setVisible(true);
        await deleteDoc(doc(db, 'catalog', id)); //Delete firestore document

        //Delete storage folder
        const photoPath = `cats/${catName}`;
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
}
export default CatalogService;