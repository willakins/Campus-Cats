import CatalogEntry from "@/components/CatalogEntry";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useState } from "react";
import { StyleSheet, ScrollView, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, Image} from 'react-native';
import MapView, { LatLng, Marker } from "react-native-maps";
import { db, storage } from "../logged-in/firebase";
import { doc, updateDoc } from "firebase/firestore";

const edit_entry = () => {
    const router = useRouter();
    const { paramId, paramName, paramInfo, paramLatitude, paramLongitude} = useLocalSearchParams();
    const id = paramId as string;
    const [name, setName] = useState<string>(paramName as string);
    const [info, setInfo] = useState<string>(paramInfo as string);
    const [longitude, setLongitude] = useState<number>(parseFloat(paramLongitude as string));
    const [latitude, setLatitude] = useState<number>(parseFloat(paramLatitude as string));
    
    var most_recent_sighting:LatLng = {
      latitude: latitude,
      longitude: longitude,
    };
    const [profilePicUrl, setProfilePicUrl] = useState("");
    const [profilePicName, setProfilePicName] = useState(""); // Store actual filename of profile pic
    const [extraPics, setExtraPics] = useState<{ url: string; name: string }[]>([]);

    const fetchCatImages = async () => {
      try {
        const folderRef = ref(storage, `cats/${name}/`);
        const result = await listAll(folderRef);
  
        let profilePic = "";
        let profileName = "";
        let extraPicsArray: { url: string; name: string }[] = [];
  
        for (const itemRef of result.items) {
          const url = await getDownloadURL(itemRef);
  
          if (itemRef.name.includes("_profile")) {
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
        console.error("Error fetching images: ", error);
      }
    };
      
  useEffect(() => {
    fetchCatImages();
  }, []);

    const handleBack = () => {
        router.push({
            pathname: "/catalog/view-entry", // Dynamically navigate to the details page
            params: { paramId:id, paramName:name, paramInfo:info, paramLatitude:latitude, 
              paramLongitude:longitude}, // Pass the details as query params
          });
    };

    const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setLatitude(latitude);
      setLongitude(longitude);
    };

    const deletePicture = async (catName: string, index: number) => {
      try {
        const folderRef = ref(storage, `cats/${catName}/`);
        
        // List all images in the cat's folder
        const result = await listAll(folderRef);
        
        if (index >= result.items.length) {
          alert("Error Invalid image index.");
          return;
        }
    
        // Sort items to ensure ordering (if needed)
        const sortedItems = result.items.sort((a, b) => a.name.localeCompare(b.name));
    
        // Get the specific image reference
        const imageRef = sortedItems[index]; 
    
        // Delete the file from Firebase Storage
        await deleteObject(imageRef);
        
        alert("Success Image deleted successfully!");
      } catch (error) {
        alert("Error Failed to delete the image.");
        console.error("Error deleting image: ", error);
      }
    };

    const swapProfilePicture = async (selectedPic: { url: string; name: string }) => {
      try {
        if (!profilePicName || !selectedPic.name) {
          alert("Error Could not find profile picture or selected picture.");
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
        alert("Success Profile picture updated!");
      } catch (error) {
        console.error("Error swapping profile picture:", error);
        alert("Error Failed to swap profile picture.");
      }
    };

    const handleSave = async () => {
      if (!name.trim()) {
        alert("Invalid Name Cat name cannot be empty.");
        return;
      }
      try {
        // Reference to the Firestore document using its ID
        const catDocRef = doc(db, "catalog", id);
  
        // Update the 'name' field in Firestore
        await updateDoc(catDocRef, { 
          name: name,
          mostRecentSighting: most_recent_sighting,
          info: info
        });
  
        alert("Success cat name updated successfully!");
        router.push({
          pathname: "/catalog/view-entry", // Dynamically navigate to the details page
          params: { paramId:id, paramName:name, paramInfo:info, paramLatitude:latitude, 
            paramLongitude:longitude}, // Pass the details as query params
        });
      } catch (error) {
        console.error("Error updating name:", error);
        alert("Error Failed to update name.");
      }
    };

    return (
      <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <TouchableOpacity style={styles.logoutButton} onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={25} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={handleSave}>
          <Text style ={styles.editText}> Save Entry</Text>
        </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.entryContainer}>
        <Text style={styles.title}>Edit A Catalog Entry</Text>
        {profilePicUrl ? (<Image source={{ uri: profilePicUrl }} style={styles.image} resizeMode="contain" />) : 
                <Text style={styles.title}>Loading image...</Text>}
        <Text style={styles.headline}>Cat's Name</Text>
        <TextInput 
            value={name}
            placeholderTextColor = '#888'
            onChangeText={setName} 
            style={styles.input} />
        <Text style={styles.headline}>Description</Text>
        <TextInput
          value={info}
          placeholderTextColor = '#888'
          onChangeText={setInfo} 
          style={styles.descInput} 
          multiline={true}/>
        <Text style={styles.headline}> Most Recent Sighting</Text>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 33.7756, // Default location (e.g., Georgia Tech)
            longitude: -84.3963,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress} // This updates the location correctly
        >
          {most_recent_sighting && <Marker coordinate={most_recent_sighting} />}
        </MapView>
        <Text style={styles.headline}> Extra Photos</Text>
        <Text style={styles.subHeading}> The photo you click will turn into the cat's profile picture</Text>
        <View style={styles.extraPicsContainer}>
          {extraPics ? (extraPics.map((pic, index) => (
            <View key={index} style={styles.imageWrapper}>
              <TouchableOpacity key={index} onPress={() => swapProfilePicture(pic)}>
                <Image source={{ uri: pic.url }} style={styles.extraPic} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deletePicture(name, index)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))):<Text>Loading images...</Text>}
        </View>
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
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  extraPicsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  imageWrapper: {
    alignItems: "center",
    margin: 10,
  },
  extraPic: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
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
    flexDirection: "row", 
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
    flexDirection: "row", 
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