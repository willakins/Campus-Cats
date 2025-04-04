import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { Button, CameraButton, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';


const create_ann = () =>{
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [info, setInfo] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const database = DatabaseService.getInstance();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/announcements')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={() => database.handleAnnouncementCreate(title, info, photos, setVisible, router)}>
        <Text style={textStyles.editText}> Create Announcement</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Create An Announcement</Text>
        <View style={containerStyles.inputContainer}>
          <Text style={textStyles.headline}>Title</Text>
          <TextInput 
            placeholder="title"
            placeholderTextColor="#888"
            onChangeText={setTitle} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Description</Text>
          <TextInput
            placeholder="Type a description about the announcement."
            placeholderTextColor="#888"
            onChangeText={setInfo} 
            style={textStyles.descInput} 
            multiline={true}/>
            <Text style={textStyles.headline2}>Want to Add Photos?</Text>
        <View style={containerStyles.cameraView}>
          <CameraButton onPhotoSelected={(newPhotoUri) => setPhotos((prevPics) => 
            [...prevPics,newPhotoUri,])}></CameraButton>
          {photos ? (photos.map((pic, index) => (
          <View key={index} style={containerStyles.imageWrapper}>
            <Image source={{ uri: pic }} style={containerStyles.extraPic} />
            <Button style={buttonStyles.deleteButton} onPress={() => setPhotos((prevPhotos) => prevPhotos.filter((uri) => uri !== pic))}>
              <Text style={textStyles.deleteButtonText}>Delete</Text>
            </Button>
          </View>
          ))):<Text>Loading images...</Text>}
        </View>
        </View>
        
        <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Announcement...
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default create_ann;