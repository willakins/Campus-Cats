import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, listAll, uploadBytes, uploadBytesResumable, ref } from 'firebase/storage';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, ImageButton, CameraButton } from '@/components';
import { db, storage } from '@/services/firebase';

const edit_entry = () => {
  const router = useRouter();
  const { paramId, paramName, paramInfo} = useLocalSearchParams();
  const id = paramId as string;
  const oldName = paramName as string;
  const [name, setName] = useState<string>(paramName as string);
  const [info, setInfo] = useState<string>(paramInfo as string);
  const [visible, setVisible] = useState<boolean>(false);

  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [profilePicName, setProfilePicName] = useState(''); // Store actual filename of profile pic
  const [extraPics, setExtraPics] = useState<{ url: string; name: string }[]>([]);
  const [newPics, setNewPics] = useState<{ url: string; name: string }[]>([]);
  const [newPhotosAdded, setNewPhotos] = useState<boolean>(false);

  const fetchCatImages = async () => {
    try {
      const folderRef = ref(storage, `cats/${name}/`);
      const result = await listAll(folderRef);

      let profilePic = '';
      let profileName = '';
      let extraPicsArray: { url: string; name: string }[] = [];

      for (const itemRef of result.items) {
        const url = await getDownloadURL(itemRef);

        if (itemRef.name.includes('_profile')) {
          profilePic = url;
          profileName = itemRef.name;
        } else {
          extraPicsArray.push({ url, name: itemRef.name });
        }
      }

      setProfilePicUrl(profilePic);
      setProfilePicName(profileName);
      setExtraPics(extraPicsArray);
    } catch (error) {
      console.error('Error fetching images: ', error);
    }
  };

  useEffect(() => {
    fetchCatImages();
  }, []);

  const handleBack = () => {
    router.push({
      pathname: '/catalog/view-entry', // Dynamically navigate to the details page
      params: { paramId:id, paramName:name, paramInfo:info }, // Pass the details as query params
    });
  };

  const confirmDeletion = (photoURL:string) => {
    Alert.alert(
      'Select Option',
      'Are you sure you want to delete this image forever?',
      [
        {
          text: 'Delete Forever',
          onPress: () => deletePicture(photoURL),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const deletePicture = async (photoURL:string) => {
    try {
      const imageRef = ref(storage, `cats/${name}/${photoURL}`);
      await deleteObject(imageRef);

      alert('Success Image deleted successfully!');
    } catch (error) {
      alert('Error Failed to delete the image.');
      console.error('Error deleting image: ', error);
    }
  };

  const swapProfilePicture = async (selectedPic: { url: string; name: string }) => {
    setVisible(true);
    try {
      if (!profilePicName || !selectedPic.name) {
        alert('Error Could not find profile picture or selected picture.');
        return;
      }

      const oldProfileRef = ref(storage, `cats/${name}/${profilePicName}`);
      const selectedPicRef = ref(storage, `cats/${name}/${selectedPic.name}`);

      // Fetch image blobs
      const oldProfileBlob = await (await fetch(profilePicUrl)).blob();
      const selectedPicBlob = await (await fetch(selectedPic.url)).blob();

      // Swap images:
      // 1. Delete both files
      await deleteObject(oldProfileRef);
      await deleteObject(selectedPicRef);

      // 2. Re-upload old profile picture as selectedPic.name
      const newExtraPicRef = ref(storage, `cats/${name}/${selectedPic.name}`);
      await uploadBytesResumable(newExtraPicRef, oldProfileBlob);

      // 3. Re-upload selected picture as profile picture
      const newProfilePicRef = ref(storage, `cats/${name}/${name}_profile.jpg`);
      await uploadBytesResumable(newProfilePicRef, selectedPicBlob);

      // Refresh UI
      fetchCatImages();
      alert('Success Profile picture updated!');
    } catch (error) {
      console.error('Error swapping profile picture:', error);
      alert('Error Failed to swap profile picture.');
    } finally {
      setVisible(false);
    }
  };

  const generateUniqueFileName = (existingFiles:string[], originalName:string) => {
    let fileExtension = originalName.split('.').pop(); // Get file extension (e.g., jpg, png)
    let fileNameBase = originalName.replace(/\.[^/.]+$/, ""); // Remove extension
    let newFileName;
  
    do {
      let randomInt = Math.floor(Math.random() * 10000); // Generate random number (0-9999)
      newFileName = `${fileNameBase}_${randomInt}.${fileExtension}`;
    } while (existingFiles.includes(newFileName)); // Ensure it's unique
  
    return newFileName;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Invalid Name Cat name cannot be empty.');
      return;
    }
    try {
      setVisible(true);
      // Reference to the Firestore document using its ID
      const catDocRef = doc(db, 'catalog', id);

      // Update the 'name' field in Firestore
      await updateDoc(catDocRef, { 
        name: name,
        info: info
      });

      if (oldName !== name) {
        const oldFolderRef = ref(storage, `cats/${oldName}`);
        const oldPhotos = await listAll(oldFolderRef);

        for (const item of oldPhotos.items) {
          const oldPath = item.fullPath; // Full path of old image
          const newPath = oldPath.replace(`cats/${oldName}`, `cats/${name}`); // New path

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
        const folderPath = `cats/${name}/`; // Path in Firebase Storage
        const folderRef = ref(storage, folderPath);

        // Step 1: Get a list of all existing files in the folder
        const existingFilesSnapshot = await listAll(folderRef);
        const existingFiles = existingFilesSnapshot.items.map((item) => item.name);

        // Step 3: Upload only new photos
        for (const pic of newPics) {
          const response = await fetch(pic.url);
          const blob = await response.blob();
          const existingFilesSnapshot = await listAll(folderRef);
        const existingFiles = existingFilesSnapshot.items.map((item) => item.name);

          const unique_name = generateUniqueFileName(existingFiles, "Whiskers_.jpg")
          const photoRef = ref(storage, `${folderPath}${unique_name}`);
          await uploadBytes(photoRef, blob);
        }
      }
      router.push({
        pathname: '/catalog/view-entry', // Dynamically navigate to the details page
        params: { paramId:id, paramName:name, paramInfo:info}, // Pass the details as query params
      });
    } catch (error) {
      console.error('Error updating name:', error);
      alert('Error Failed to update name.');
    } finally {
      setVisible(false);
    }
  };

  const addPhoto = (newPhotoUri: string) => {
    setExtraPics((prevPics) => [
      ...prevPics,
      { url: newPhotoUri, name: `photo_${prevPics.length + 1}` },
    ]);
    setNewPics((prevPics) => [
      ...prevPics,
      { url: newPhotoUri, name: `photo_${prevPics.length + 1}` },
    ]);
    setNewPhotos(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={styles.logoutButton} onPress={handleBack}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={styles.editButton} onPress={handleSave}>
        <Text style ={styles.editText}> Save Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={styles.entryContainer}>
        <Text style={styles.title}>Edit A Catalog Entry</Text>
        {profilePicUrl ? (<Image source={{ uri: profilePicUrl }} style={styles.image} resizeMode="contain" />) : 
          <Text style={styles.title}>Loading image...</Text>}
        <Text style={styles.headline}>Cat's Name</Text>
        <TextInput 
          value={name}
          placeholderTextColor = "#888"
          onChangeText={setName} 
          style={styles.input} />
        <Text style={styles.headline}>Description</Text>
        <TextInput
          value={info}
          placeholderTextColor = "#888"
          onChangeText={setInfo} 
          style={styles.descInput} 
          multiline={true}/>
        <Text style={styles.headline}> Extra Photos</Text>
        <Text style={styles.subHeading}> The photo you click will turn into the cat's profile picture</Text>
        <View style={styles.extraPicsContainer}>
          {extraPics ? (extraPics.map((pic, index) => (
            <View key={index} style={styles.imageWrapper}>
              <ImageButton key={index} onPress={() => swapProfilePicture(pic)}>
                <Image source={{ uri: pic.url }} style={styles.extraPic} />
              </ImageButton>
              <Button style={styles.deleteButton} onPress={() => confirmDeletion(pic.name)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Button>
            </View>
          ))):<Text>Loading images...</Text>}
          <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
            Saving...
          </Snackbar>
        </View>
        <Text style={styles.headline}> Upload Additional Photos</Text>
        <CameraButton onPhotoSelected={addPhoto}></CameraButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default edit_entry;

const styles = StyleSheet.create({
  subHeading: {
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
    marginBottom: 0
  },
  profileButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  extraPicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
    margin: 10,
  },
  extraPic: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  image: {
    width: 400,  // Set a fixed width for the profile picture
    height: 250, // Set a fixed height for the profile picture
    borderRadius: 60,  // Makes the image circular
    paddingHorizontal: 20,
  },
  entryContainer: {
    flexDirection: 'column', // Stack items vertically
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    marginBottom: 20, // Space between catalog entries
    padding: 5,
    borderRadius:10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 40,
    textAlign: 'center',
  },
  map: {
    width: '100%', 
    height: 200, 
    paddingHorizontal: 15, 
    borderRadius:10,
    marginBottom: 10,
  },
  headline: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  cameraView: {
    alignItems: 'center',
    paddingVertical: 20,  // Vertical padding
  },
  logoutButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
  },
  editButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
  },
  logoutText: {
    color: '#fff',
    marginLeft: 5,
  },
  editText: {
    color: '#fff',
    marginLeft: 0,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
  descInput: {
    height: 120,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
  dinput: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
    flexDirection: 'row', 
  },
  dateInput: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    flexDirection: 'row', 
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    margin: 5,
    display: 'flex',
    justifyContent: 'center',
  },
  dateButton: { padding: 12, backgroundColor: '#007bff', borderRadius: 5 },

  buttonText: {
    color: '#ffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',

  },
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    textAlign: 'center',
  },
  selectedPreview: {
    margin: 'auto', // Center the image
    objectFit: 'scale-down', // Don't clip the image
    width: 240,
    height: 180,
  },
});
