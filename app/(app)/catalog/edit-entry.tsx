import React, { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, ImageButton, CameraButton, CatalogImageHandler } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const edit_entry = () => {
  const router = useRouter();
  const { paramId, paramName, paramInfo} = useLocalSearchParams();
  const id = paramId as string;
  const oldName = paramName as string;
  const [name, setName] = useState<string>(paramName as string);
  const [info, setInfo] = useState<string>(paramInfo as string);
  const [visible, setVisible] = useState<boolean>(false);

  const [profilePicUrl, setProfile] = useState<string>('');
  const [extraPics, setImageUrls] = useState<string[]>([]);
  const [newPics, setNewPics] = useState<{ url: string; name: string }[]>([]);
  const [newPhotosAdded, setNewPhotos] = useState<boolean>(false);
  const database = DatabaseService.getInstance();
  const imageHandler = new CatalogImageHandler({ 
    setVisible,  
    setImageUrls, 
    setNewPics, 
    setNewPhotos,
    setProfile,
    name, 
    profilePicUrl});
    
  useFocusEffect(
    useCallback(() => {
      database.fetchCatImages(name, setProfile, setImageUrls);
    }, [profilePicUrl])
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={() => router.push({
        pathname: '/catalog/view-entry', params: { paramId:id, paramName:name, paramInfo:info }, })}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} 
      onPress={() => database.handleCatalogSave(name, oldName, info, newPics, newPhotosAdded, id, setVisible, router)}>
        <Text style ={textStyles.editText}> Save Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Edit A Catalog Entry</Text>
        {profilePicUrl ? (<Image source={{ uri: profilePicUrl }} style={containerStyles.headlineImage} resizeMode="contain" />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
          <View style={containerStyles.extraPicsContainer}>
          <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
                Saving...
          </Snackbar>
        </View>
        <View style={containerStyles.loginContainer}>
          <Text style={textStyles.headline}>Cat's Name</Text>
          <TextInput 
            value={name}
            placeholderTextColor = "#888"
            onChangeText={setName} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Description</Text>
          <TextInput
            value={info}
            placeholderTextColor = "#888"
            onChangeText={setInfo} 
            style={textStyles.descInput} 
            multiline={true}/>
        </View>
        {extraPics.length > 0 ? <Text style={textStyles.headline}> Extra Photos</Text>: null}
        {extraPics.length > 0 ? <Text style={textStyles.subHeading}> The photo you click will turn into the cat's profile picture</Text>: null}
        <View style={containerStyles.extraPicsContainer}>
          {extraPics ? (extraPics.map((pic, index) => (
            <View key={index} style={containerStyles.imageWrapper}>
              <ImageButton key={index} onPress={() => imageHandler.swapProfilePicture(pic)}>
                <Image source={{ uri: pic }} style={containerStyles.extraPic} />
              </ImageButton>
              <Button style={buttonStyles.deleteButton} onPress={() => imageHandler.confirmDeletion(pic)}>
                <Text style={textStyles.deleteButtonText}>Delete</Text>
              </Button>
            </View>
          ))):<Text>Loading images...</Text>}
        </View>
        <Text style={textStyles.headline}> Upload Additional Photos</Text>
        <CameraButton onPhotoSelected={imageHandler.addPhoto}></CameraButton>
        <Button style={buttonStyles.deleteButton}onPress={() => database.deleteCatalogEntry(name, id, setVisible, router)}> Delete Catalog Entry</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default edit_entry;

//comment 3 updated
