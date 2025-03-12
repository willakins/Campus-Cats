import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@/config/firebase';
import { Button, TextInput, IconButton } from '@/components';
import { addDoc, collection } from 'firebase/firestore';
import { getStorage, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Button, CameraButton, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';


const create_entry = () =>{
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [info, setInfo] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [profile, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <IconButton iconName="arrow-back-outline" onPress={handleBack} style={styles.logoutButton}/>
      <Button style={styles.editButton} onPress={handleCreate}>
        <Text style={styles.editText}> Create Entry</Text>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={() => database.handleCatalogCreate(name, info, profile, setVisible, router)}>
        <Text style={textStyles.editText}> Create Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Create A Catalog Entry</Text>
        <View style={containerStyles.inputContainer}>
          <Text style={textStyles.headline}>Cat's Name</Text>
          <TextInput 
            placeholder="What is the cat's name?"
            placeholderTextColor="#888"
            onChangeText={setName} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Description</Text>
          <TextInput
            placeholder="Type a description about the cat."
            placeholderTextColor="#888"
            onChangeText={setInfo} 
            style={textStyles.descInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Select Profile Picture</Text>
          <View style={containerStyles.cameraView}>
            <CameraButton onPhotoSelected={setProfile}></CameraButton>
            {profile ? <Image source={{ uri: profile }} style={containerStyles.selectedPreview} /> : null}
          </View>
        </View>
        <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Entry...
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default create_entry;