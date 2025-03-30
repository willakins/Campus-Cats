import React, { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput, CameraButton, CatalogImageHandler } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { StationEntryObject } from '@/types/StationEntryObject';

const edit_station = () => {
  const router = useRouter();
  const { paramId, paramName, paramPic, paramLong, paramLat, paramStocked, paramCats, paramLastStocked, paramStockingFreq} = useLocalSearchParams();
  const id = paramId as string;
  const [name, setName] = useState<string>(paramName as string);
  const originalName = name;
  const [profilePic, setProfile] = useState<string>(paramPic as string);
  const longitude = (paramLong as string) as unknown as number;
  const latitude = (paramLat as string) as unknown as number;
  const lastStocked = paramLastStocked as string;
  const stockingFreq = (paramStockingFreq as string) as unknown as number;
  const [knownCats, setKnownCats] = useState<string>(paramCats as string);
  const isStocked = paramStocked === "true";
  const [visible, setVisible] = useState<boolean>(false);
  const database = DatabaseService.getInstance();
  const thisStation = new StationEntryObject(id, name, profilePic, longitude, latitude, lastStocked, stockingFreq, knownCats);
    
  useFocusEffect(
    useCallback(() => {
      database.fetchStationImages(profilePic, setProfile);
    }, [profilePic])
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={() => router.push({
        pathname: '/stations/view-station', params: { paramId:id, paramName:name, paramPic:paramPic, paramLong:paramLong, paramLat:paramLat, paramStocked:paramStocked, paramCats:knownCats },
      })}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} 
      onPress={() => database.saveStation(thisStation, originalName, setVisible, router)}>
        <Text style ={textStyles.editText}> Save Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Edit A Station Entry</Text>
        {profilePic ? (<Image source={{ uri: profilePic }} style={containerStyles.headlineImage} resizeMode="contain" />) : 
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
            value={knownCats}
            placeholderTextColor = "#888"
            onChangeText={setKnownCats} 
            style={textStyles.descInput} 
            multiline={true}/>
        </View>
        <Text style={textStyles.headline}> Change Profile Photo </Text>
        <View style={containerStyles.cameraView}>
          <CameraButton onPhotoSelected={setProfile}></CameraButton>
        </View>
        <Button style={buttonStyles.deleteButton}onPress={() => database.deleteStation(id, setVisible, router)}> Delete Station Entry</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default edit_station;