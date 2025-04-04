import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, CameraButton } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { AnnouncementEntryObject } from '@/types';

const edit_ann = () => {
  const router = useRouter();
  const { paramId, paramTitle, paramInfo, paramPhotos, paramCreatedAt, paramCreatedBy } = useLocalSearchParams();
  
  const id = paramId as string;
  const [title, setTitle] = useState<string>(paramTitle as string);
  const [info, setInfo] = useState<string>(paramInfo as string);
  const createdAt = paramCreatedAt as string;
  const createdBy = paramCreatedBy as string;

  const [photos, setPhotos] = useState<string[]>([]);
  const [isPicsChanged, setPicsChanged] = useState<boolean>(false);
  const thisAnn = new AnnouncementEntryObject(id, title, info, createdAt, createdBy);

  const [visible, setVisible] = useState<boolean>(false);
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchAnnouncementImages(id, setPhotos);
  }, [isPicsChanged]);

  const addPhoto = (newPhotoUri: string) => {
    setPhotos((prevPics) => [
      ...prevPics,
      newPhotoUri,
    ]);
    setPicsChanged(true);
  };
  
  const deleteImage = (imageUri: string) => {
    setPhotos((prevPhotos) => prevPhotos.filter((pic) => pic !== imageUri));
    setPicsChanged(true);
  };

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push({
        pathname: '/announcements/view-ann', 
        params: { paramId:id, paramTitle:title, paramInfo:info, paramPhotos, paramCreatedAt, paramCreatedBy }, })}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={() => database.handleAnnouncementSave(thisAnn, photos, isPicsChanged, setVisible, router)}>
        <Text style ={textStyles.editText}> Save Announcement</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Edit An Announcement</Text>
        <View style={containerStyles.loginContainer}>
        <Text style={textStyles.headline}>Title</Text>
        <TextInput 
          value={title}
          placeholderTextColor = "#888"
          onChangeText={setTitle} 
          style={textStyles.input} />
        <Text style={textStyles.headline}>Description</Text>
        <TextInput
          value={info}
          placeholderTextColor = "#888"
          onChangeText={setInfo} 
          style={textStyles.descInput} 
          multiline={true}/>
        </View>
        
        {photos.length > 0 ? <Text style={textStyles.headline2}> Photos</Text> : null}
        <View style={containerStyles.extraPicsContainer}>
          {photos ? (photos.map((pic, index) => (
            <View key={index} style={containerStyles.imageWrapper}>
              <Image source={{ uri: pic }} style={containerStyles.extraPic} />
              <Button style={buttonStyles.deleteButton} onPress={() => deleteImage(pic)}>
                <Text style={textStyles.deleteButtonText}>Delete</Text>
              </Button>
            </View>
          ))):<Text>Loading images...</Text>}
          <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
            Saving...
          </Snackbar>
        </View>
        <Text style={textStyles.headline}> Upload Additional Photos</Text>
        <CameraButton onPhotoSelected={addPhoto}></CameraButton>
        <Button style={buttonStyles.deleteButton}onPress={() => database.deleteAnnouncement(id)}> Delete Announcement</Button>
      </ScrollView>
    </SafeAreaView>
  );
}
export default edit_ann;