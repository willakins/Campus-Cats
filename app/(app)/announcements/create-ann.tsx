import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { Button, CameraButton, TextInput } from '@/components';
import DatabaseService from '@/components/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';


const create_ann = () =>{
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [info, setInfo] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [profile, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();
  
  const handleCreate = () => {
    database.handleAnnouncementCreate(name, info, profile, setVisible);
    router.push('/announcements');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/announcements')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={handleCreate}>
        <Text style={textStyles.editText}> Create Announcement</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Create An Announcement</Text>
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
        <Text style={textStyles.headline}>Want to Add Photos?</Text>
        <View style={containerStyles.cameraView}>
          <CameraButton onPhotoSelected={setProfile}></CameraButton>
          {profile ? <Image source={{ uri: profile }} style={containerStyles.selectedPreview} /> : null}
        </View>
        <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Announcement...
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default create_ann;