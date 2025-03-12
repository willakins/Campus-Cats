import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { Button, CameraButton, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';


const create_station = () =>{
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [cats, setCats] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [profile, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={() => database.handleStationCreate(name, info, profile, setVisible, router)}>
        <Text style={textStyles.editText}> Create Station</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.entryContainer}>
        <Text style={textStyles.title}>Create A Station Entry</Text>
        <View style={containerStyles.inputContainer}>
          <Text style={textStyles.headline}>Station Name</Text>
          <TextInput 
            placeholder="What should this station be referred to as?"
            placeholderTextColor="#888"
            onChangeText={setName} 
            style={textStyles.input} />
          <Text style={textStyles.headline}>Cats Known to Frequent This Station (optional)</Text>
          <TextInput
            placeholder="Common cats"
            placeholderTextColor="#888"
            onChangeText={setCats} 
            style={textStyles.descInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Select Profile Picture</Text>
          <View style={containerStyles.cameraView}>
            <CameraButton onPhotoSelected={setProfile}></CameraButton>
            {profile ? <Image source={{ uri: profile }} style={containerStyles.selectedPreview} /> : null}
          </View>
        </View>
        <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Entry...
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export default create_station;