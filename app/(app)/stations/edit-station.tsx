import React, { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, CameraButton, CatalogImageHandler } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const edit_station = () => {
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
        pathname: '/stations/view-station', params: { paramId:id, paramName:name, paramInfo:info }, })}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} 
      onPress={() => database.handleStationSave(name, oldName, info, newPics, newPhotosAdded, id, setVisible, router)}>
        <Text style ={textStyles.editText}> Save Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Edit A Station Entry</Text>
        {profilePicUrl ? (<Image source={{ uri: profilePicUrl }} style={containerStyles.headlineImage} resizeMode="contain" />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
          <View style={containerStyles.extraPicsContainer}>
          <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
                Saving...
          </Snackbar>
        </View>
        <View style={containerStyles.loginContainer}>
          <Text style={textStyles.headline}>Station Name</Text>
          <TextInput 
            value={name}
            placeholderTextColor = "#888"
            onChangeText={setName} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Cats Known to Frequent This Station (optional)</Text>
          <TextInput
            value={info}
            placeholderTextColor = "#888"
            onChangeText={setInfo} 
            style={textStyles.descInput} 
            multiline={true}/>
        </View>
        <Text style={textStyles.headline}> Change Profile Photo </Text>
        <CameraButton onPhotoSelected={imageHandler.addPhoto}></CameraButton>
        <Button style={buttonStyles.deleteButton}onPress={() => database.deleteCatalogEntry(name, id, setVisible, router)}> Delete Catalog Entry</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default edit_station;