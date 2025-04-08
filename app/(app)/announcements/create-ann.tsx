import { useState } from 'react';
import { Image, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { Button, CameraButton, SnackbarMessage, TextInput } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { useAuth } from '@/providers/AuthProvider';
import { AnnouncementEntryObject } from '@/types';


const create_ann = () =>{
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);
  const [info, setInfo] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const database = DatabaseService.getInstance();

  const createObj = () => {
    return new AnnouncementEntryObject("-1", title, info, '', createdBy)
  }

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/announcements')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Creating Announcement..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.announcementTitle}>Create Announcement</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <View style={containerStyles.card}>
          <Text style={textStyles.label}>Title</Text>
          <View style={containerStyles.inputContainer2}>
            <TextInput 
              placeholder="title"
              placeholderTextColor="#888"
              onChangeText={setTitle} 
              style={textStyles.input} />
          </View>
          <Text style={textStyles.label}>Description</Text>
          <View style={containerStyles.inputContainer2}>
            <TextInput
              placeholder="Type a description about the announcement."
              placeholderTextColor="#888"
              onChangeText={setInfo} 
              style={textStyles.descInput} 
              multiline={true}/>
          </View>
          <Text style={textStyles.label}>Alias (optional)</Text>
          <View style={containerStyles.inputContainer2}>
            <TextInput
              placeholder="Choose an author alias to replace id"
              placeholderTextColor="#888"
              onChangeText={setCreatedBy} 
              style={textStyles.descInput} 
              multiline={false}/>
          </View>
          
          <Text style={textStyles.headline2}>Add Photos (optional)</Text>
          <CameraButton onPhotoSelected={(newPhotoUri) => setPhotos((prevPics) => 
            [...prevPics,newPhotoUri,])}></CameraButton>
        <View style={containerStyles.extraPicsContainer}>
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
      </ScrollView>
      <Button style={buttonStyles.button2} onPress={() => database.handleAnnouncementCreate(createObj(), photos, user, setVisible, router)}>
        <Text style={textStyles.bigButtonText}> Create Announcement</Text>
      </Button>
    </SafeAreaView>
  );
}
export default create_ann;