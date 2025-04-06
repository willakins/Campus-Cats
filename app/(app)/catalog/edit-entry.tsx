import React, { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, ImageButton, CameraButton, CatalogImageHandler } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { CatalogEntryObject } from '@/types/CatalogEntryObject';

const edit_entry = () => {
  const router = useRouter();
  const { id, name, descShort, descLong, colorPattern, behavior, yearsRecorded, AoR, currentStatus, furLength, furPattern, tnr, sex, credits} = useLocalSearchParams() as 
        { id: string, name: string, descShort: string, descLong: string, colorPattern: string, behavior: string, yearsRecorded: string, AoR: string, 
          currentStatus: string, furLength: string, furPattern: string, tnr: string, sex: string, credits:string};

  const [formData, setFormData] = useState({id, name, descShort, descLong, colorPattern, behavior, yearsRecorded, AoR, currentStatus, furLength, 
    furPattern, tnr, sex, credits});
  
  const [visible, setVisible] = useState<boolean>(false);
  
  const handleChange = (field: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const [profilePicUrl, setProfile] = useState<string>('');
  const [extraPics, setImageUrls] = useState<string[]>([]);
  const [newPics, setNewPics] = useState<{ url: string; name: string }[]>([]);
  const [newPhotosAdded, setNewPhotos] = useState<boolean>(false);
  const database = DatabaseService.getInstance();
  const imageHandler = new CatalogImageHandler({ setVisible, setImageUrls, setNewPics, setNewPhotos, setProfile, name, id, profilePicUrl});
    
  useFocusEffect(
    useCallback(() => {
      database.fetchCatImages(id, setProfile, setImageUrls);
    }, [profilePicUrl])
  );

  const createObj = () => {
    return new CatalogEntryObject(formData.id, formData.name, formData.descShort, formData.descLong, formData.colorPattern, formData.behavior, 
      formData.yearsRecorded, formData.AoR, formData.currentStatus, formData.furLength, formData.furPattern, formData.tnr, formData.sex, 
      formData.credits)
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={() => router.push({
        pathname: '/catalog/view-entry', 
        params: { id:formData.id, name:formData.name, descShort:formData.descShort, descLong:formData.descLong, colorPattern:formData.colorPattern, 
          behavior:formData.behavior, yearsRecorded:formData.yearsRecorded, AoR:formData.AoR, currentStatus:formData.currentStatus, 
          furLength:formData.furLength, furPattern:formData.furPattern, tnr:formData.tnr, sex:formData.sex, credits:formData.credits}, })}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} 
      onPress={() => database.handleCatalogSave(createObj(), newPics, newPhotosAdded, setVisible, router)}>
        <Text style ={textStyles.editText}> Save Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Edit A Catalog Entry</Text>
        {profilePicUrl ? (<Image source={{ uri: profilePicUrl }} style={containerStyles.headlineImage} resizeMode="contain" />) : 
          <Text style={textStyles.title}>Loading image...</Text>}
        <View style={containerStyles.loginContainer}>
          <Text style={textStyles.headline}>Cat's Name</Text>
          <TextInput 
            value={formData.name}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('name', text)} 
            style={textStyles.catalogInput} />
          <Text style={textStyles.headline}>Short Description</Text>
          <TextInput
            value={formData.descShort}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('descShort', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Long Description</Text>
          <TextInput
            value={formData.descLong}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('descLong', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Detailed Color Pattern</Text>
          <TextInput
            value={formData.colorPattern}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('colorPattern', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Behavior</Text>
          <TextInput
            value={formData.behavior}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('behavior', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Years Recorded</Text>
          <TextInput
            value={formData.yearsRecorded}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('yearsRecorded', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Area of Residence</Text>
          <TextInput
            value={formData.AoR}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('AoR', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Current Status</Text>
          <TextInput
            value={formData.currentStatus}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('currentStatus', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Fur Length</Text>
          <TextInput
            value={formData.furLength}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('furLength', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Fur Pattern</Text>
          <TextInput
            value={formData.furPattern}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('furPattern', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Tnr</Text>
          <TextInput
            value={formData.tnr}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('tnr', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Sex</Text>
          <TextInput
            value={formData.sex}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('sex', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Credits</Text>
          <TextInput
            value={formData.credits}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('credits', text)} 
            style={textStyles.catalogDescInput} 
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
      <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
        Saving...
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
export default edit_entry;
