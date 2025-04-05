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
  const oldName = name;

  const [formData, setFormData] = useState({id, name, descShort, descLong, colorPattern, behavior, yearsRecorded, AoR, currentStatus, furLength, 
    furPattern, tnr, sex, credits});

  const thisEntry = new CatalogEntryObject(id, name, descShort, descLong, colorPattern, behavior, yearsRecorded, AoR, currentStatus, furLength, 
    furPattern, tnr, sex, credits)
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
  const imageHandler = new CatalogImageHandler({ setVisible, setImageUrls, setNewPics, setNewPhotos, setProfile, name, profilePicUrl});
    
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
        pathname: '/catalog/view-entry', 
        params: { id:id, name:name, descShort:descShort, descLong:descLong, colorPattern:colorPattern, behavior:behavior, yearsRecorded:yearsRecorded, AoR:AoR, 
          currentStatus:currentStatus, furLength:furLength, furPattern:furPattern, tnr:tnr, sex:sex, credits:credits}, })}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} 
      onPress={() => database.handleCatalogSave(thisEntry, oldName, newPics, newPhotosAdded, setVisible, router)}>
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
            value={thisEntry.name}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('name', text)} 
            style={textStyles.catalogInput} />
          <Text style={textStyles.headline}>Short Description</Text>
          <TextInput
            value={thisEntry.descShort}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('descShort', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Long Description</Text>
          <TextInput
            value={thisEntry.descLong}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('descLong', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Detailed Color Pattern</Text>
          <TextInput
            value={thisEntry.colorPattern}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('colorPattern', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Behavior</Text>
          <TextInput
            value={thisEntry.behavior}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('behavior', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Years Recorded</Text>
          <TextInput
            value={thisEntry.yearsRecorded}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('yearsRecorded', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Area of Residence</Text>
          <TextInput
            value={thisEntry.AoR}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('AoR', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Current Status</Text>
          <TextInput
            value={thisEntry.currentStatus}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('currentStatus', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Fur Length</Text>
          <TextInput
            value={thisEntry.furLength}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('furLength', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Fur Pattern</Text>
          <TextInput
            value={thisEntry.furPattern}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('furPattern', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Tnr</Text>
          <TextInput
            value={thisEntry.tnr}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('tnr', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Sex</Text>
          <TextInput
            value={thisEntry.sex}
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('sex', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Credits</Text>
          <TextInput
            value={thisEntry.credits}
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
    </KeyboardAvoidingView>
  );
}
export default edit_entry;