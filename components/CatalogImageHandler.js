class CatalogImageHandler {
    constructor(setVisible, fetchCatImages, setExtraPics, setNewPics, setNewPhotos) {
      this.setVisible = setVisible;
      this.fetchCatImages = fetchCatImages;
      this.setExtraPics = setExtraPics;
      this.setNewPics = setNewPics;
      this.setNewPhotos = setNewPhotos;
    }

    generateUniqueFileName = (existingFiles, originalName) => {
      let fileExtension = originalName.split('.').pop(); // Get file extension (e.g., jpg, png)
      let fileNameBase = originalName.replace(/\.[^/.]+$/, ""); // Remove extension
      let newFileName;
    
      do {
        let randomInt = Math.floor(Math.random() * 10000); // Generate random number (0-9999)
        newFileName = `${fileNameBase}_${randomInt}.${fileExtension}`;
      } while (existingFiles.includes(newFileName)); // Ensure it's unique
    
      return newFileName;
    };

    swapProfilePicture = async (selectedPic) => {
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

    confirmDeletion = (photoURL) => {
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
  
    deletePicture = async (photoURL) => {
      try {
        const imageRef = ref(storage, `cats/${name}/${photoURL}`);
        await deleteObject(imageRef);
        fetchCatImages();
  
        alert('Success Image deleted successfully!');
      } catch (error) {
        alert('Error Failed to delete the image.');
        console.error('Error deleting image: ', error);
      }
    };

    addPhoto = (newPhotoUri) => {
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
}

export { CatalogImageHandler };