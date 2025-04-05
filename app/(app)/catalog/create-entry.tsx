import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';
import { Button, CameraButton, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { CatalogEntryObject } from '@/types/CatalogEntryObject';
import { useAuth } from '@/providers/AuthProvider';

const create_entry = () =>{
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState({name: "", descShort: "", descLong: "", colorPattern: "", behavior: "", yearsRecorded: "", AoR: "", 
    currentStatus: "", furLength: "", furPattern: "", tnr: "", sex: "",credits: ""});

  const handleChange = (field: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const new_id = ""
  const thisEntry = new CatalogEntryObject(new_id, formData.name, formData.descShort, formData.descLong, formData.colorPattern, formData.behavior, formData.yearsRecorded, 
    formData.AoR, formData.currentStatus, formData.furLength, formData.furPattern, formData.tnr, formData.sex, formData.credits)

  const [profile, setProfile] = useState<string>('');
  const database = DatabaseService.getInstance();
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={() => database.handleCatalogCreate(thisEntry, profile, user, setVisible, router)}>
        <Text style={textStyles.editText}> Create Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.catalogEntryContainer}>
        <Text style={textStyles.title}>Create A Catalog Entry</Text>
        <View style={containerStyles.catalogInputContainer}>
          <Text style={textStyles.headline}>Cat's Name</Text>
          <TextInput 
            placeholder="What is the cat's name?"
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('name', text)} 
            style={textStyles.catalogInput} />
          <Text style={textStyles.headline}>Short Description</Text>
          <TextInput
            placeholder="Few words to recognize this cat"
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('descShort', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Long Description</Text>
          <TextInput
            placeholder="Type a description about the cat."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('descLong', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Detailed Color Pattern</Text>
          <TextInput
            placeholder="Describe the cat's fur."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('colorPattern', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Behavior</Text>
          <TextInput
            placeholder="How does the cat act?"
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('behavior', text)} 
            style={textStyles.catalogDescInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Years Recorded</Text>
          <TextInput
            placeholder="What Years has the cat been seen?"
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('yearsRecorded', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Area of Residence</Text>
          <TextInput
            placeholder="What buildings/region does the cat stick around?"
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('AoR', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Current Status</Text>
          <TextInput
            placeholder="Feral, Adopted, Frat Cat, Deceased, Unknown."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('currentStatus', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Fur Length</Text>
          <TextInput
            placeholder="Long, medium, or short."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('furLength', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Fur Pattern</Text>
          <TextInput
            placeholder="Calico, Tabby, Tuxedo, etc."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('furPattern', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Tnr</Text>
          <TextInput
            placeholder="Has this cat been trapped, neutered, and released? Yes, No, or Unknown."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('tnr', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Sex</Text>
          <TextInput
            placeholder="What sex is the cat? Unknown, Male, Female."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('sex', text)} 
            style={textStyles.catalogInput} 
            multiline={true}/>
          <Text style={textStyles.headline}>Credits</Text>
          <TextInput
            placeholder="Add credits about images and descriptions."
            placeholderTextColor="#888"
            onChangeText={(text) => handleChange('credits', text)} 
            style={textStyles.catalogDescInput} 
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
export default create_entry;