import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, TextInput, CameraButton, SnackbarMessage } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { useAuth } from '@/providers/AuthProvider';
import { AnnouncementEntryObject } from '@/types';

const edit_ann = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { id, title, info, createdAt, createdBy } = useLocalSearchParams() as {id:string, title:string, info:string, createdAt:string, createdBy:string};

  const [formData, setFormData] = useState({id, title, info, createdAt, createdBy });
  
  const handleChange = (field: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPicsChanged, setPicsChanged] = useState<boolean>(false);

  const [visible, setVisible] = useState<boolean>(false);
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchAnnouncementImages(id, setPhotos);
  }, []);

  const addPhoto = (newPhotoUri: string) => {
    setPhotos((photos) => [
      ...photos,
      newPhotoUri,
    ]);
    setPicsChanged(true);
  };
  
  const deleteImage = (imageUri: string) => {
    setPhotos((prevPhotos) => prevPhotos.filter((pic) => pic !== imageUri));
    setPicsChanged(true);
  };

  const createObj = () => {
    return new AnnouncementEntryObject(id, formData.title, formData.info, '', formData.createdBy);
  }

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Saving Announcement..." visible={visible} setVisible={setVisible} />
      <Text style={textStyles.announcementTitle}>Edit Announcement</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <View style={containerStyles.card}>
          <View style={containerStyles.inputContainer2}>
            <TextInput 
              value={formData.title}
              placeholderTextColor = "#888"
              onChangeText={(text) => handleChange('title', text)} 
              style={textStyles.input} />
          </View>
          <View style={containerStyles.inputContainer2}>
            <TextInput
              value={formData.info}
              placeholderTextColor = "#888"
              onChangeText={(text) => handleChange('info', text)} 
              style={textStyles.descInput} 
              multiline={true}/>
          </View>
          <View style={containerStyles.inputContainer2}>
            <TextInput
              placeholder="Choose an author alias to replace id"
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('createdBy', text)} 
              style={textStyles.descInput} 
              multiline={false}/>
          </View>
        <Text style={textStyles.titleCentered}>Add a picture</Text>
          <CameraButton onPhotoSelected={(newPhotoUri) => {
            setPhotos((prevPics) => [...prevPics, newPhotoUri]);
            setPicsChanged(true);
            }}/>
          {photos.length > 0 ? <Text style={textStyles.label}> Photos</Text> : null}
        <View style={containerStyles.extraPicsContainer}>
          {photos ? (photos.map((pic, index) => (
            <View key={index} style={containerStyles.imageWrapper}>
              <Image source={{ uri: pic }} style={containerStyles.extraPic} />
              <Button style={buttonStyles.deleteButton} onPress={() => deleteImage(pic)}>
                <Text style={textStyles.deleteButtonText}>Delete</Text>
              </Button>
            </View>
          ))):<Text>Loading images...</Text>}
        </View>
        </View> 
      </ScrollView>
      <Button style={buttonStyles.button2} onPress={() => database.handleAnnouncementSave(createObj(), photos, isPicsChanged, user, setVisible, router)}>
        <Text style ={textStyles.bigButtonText}> Save Announcement</Text>
      </Button>
      <Button style={buttonStyles.button3}onPress={() => database.deleteAnnouncement(id, router, setVisible)}> 
        <Text style={textStyles.bigButtonText}>Delete Announcement</Text>
      </Button>
    </SafeAreaView>
  );
}
export default edit_ann;
