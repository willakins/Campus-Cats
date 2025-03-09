import { useState } from 'react';
import { Image, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@/config/firebase';
import { Button, TextInput } from '@/components';
import { addDoc, collection } from 'firebase/firestore';
import { getStorage, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const create_entry = () =>{

  

  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [info, setInfo] = useState<String>('');
  const [name, setName] = useState<String>('');
  const [profilePic, setProfilePic] = useState<string>('');
  
  const handleBack = () => {
    router.push('/catalog');
  };


    const handleSelectProfile = async () => {
      // Permissions check only needed for iOS 10
      const { status, } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need media library permissions to make this work!');
      }
  
      let result = await ImagePicker.launchImageLibraryAsync({
        // 100% quality, do not compress
        // e.g. 90% quality would be 0.9
        quality: 1.0,
      });
  
      if (!result.canceled) {
        setProfilePic(result.assets[0].uri);
      }
    };
  


  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Invalid Name', 'Cat name cannot be empty.');
      return;
    }
    try {
      setVisible(true);
      let profilePicUrl = '';

      if (profilePic) {
        const response = await fetch(profilePic);
        const blob = await response.blob();
        const imageRef = ref(getStorage(), `cats/${name}/${name}_profile.jpg`);
        await uploadBytes(imageRef, blob);
       
      }

      await addDoc(collection(db, 'catalog'), {
        name,
        info,
        most_recent_sighting: null,
        createdAt: new Date(),
      });

      Alert.alert('Success', 'Cat entry created successfully!');
      router.push('/catalog');
    } catch (error) {
      console.error('Error creating catalog entry:', error);
      Alert.alert('Error', 'Failed to create cat entry.');
    } finally {
      setVisible(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Button style={styles.logoutButton} onPress={handleBack}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={styles.editButton} onPress={handleCreate}>
        <Text style={styles.editText}> Create Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={styles.entryContainer}>
        <Text style={styles.title}>Create A Catalog Entry</Text>
        <Text style={styles.headline}>Cat's Name</Text>
        <TextInput 
          placeholder="What is the cat's name?"
          placeholderTextColor="#888"
          onChangeText={setName} 
          style={styles.input} />
        <Text style={styles.headline}>Description</Text>
        <TextInput
          placeholder="Type a description about the cat."
          placeholderTextColor="#888"
          onChangeText={setInfo} 
          style={styles.descInput} 
          multiline={true}/>
        <Text style={styles.headline}>Select Profile Picture</Text>
        <View style={styles.cameraView}>
          <Button style={styles.cameraButton} onPress={handleSelectProfile}>
            <Ionicons name="camera-outline" size={29} color="#fff" />
          </Button>
        </View>
        {profilePic ? <Image source={{ uri: profilePic }} style={styles.selectedPreview} /> : null}
        

        <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Entry...
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default create_entry;

const styles = StyleSheet.create({
  subHeading: {
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
    marginBottom: 0
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
  headline: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
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
  editText: {
    color: '#fff',
    marginLeft: 0,
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
  cameraView: {
    alignItems: 'center',
    paddingVertical: 20,  // Vertical padding
  },
  cameraButton: {
    width: 70,  // Width of the circle
    height: 70, // Height of the circle (same as width to make it circular)
    borderRadius: 35, // Half of width/height to make it circular
    backgroundColor: '#333', // Button color (blue)
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
    elevation: 5,  // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
    paddingVertical: 10,  // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
  },
  selectedPreview: {
    margin: 'auto', // Center the image
    objectFit: 'scale-down', // Don't clip the image
    width: 240,
    height: 180,
  },
});
