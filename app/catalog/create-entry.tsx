import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Snackbar } from 'react-native-paper';

import { Button, TextInput } from '@/components';

const create_entry = () =>{
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(false);
  const [info, setInfo] = useState<String>('');
  const [name, setName] = useState<String>('');

  const handleBack = () => {
    router.push('/catalog');
  };

  const handleCreate = () => {
    //TODO
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Button style={styles.logoutButton} onPress={handleBack}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={styles.editButton} onPress={handleCreate}>
        <Text style ={styles.editText}> Create Entry</Text>
      </Button>
      <ScrollView contentContainerStyle={styles.entryContainer}>
        <Text style={styles.title}>Create A Catalog Entry</Text>
        <Text style={styles.headline}>Cat's Name</Text>
        <TextInput 
          placeholder="What is the cat's name?"
          placeholderTextColor = "#888"
          onChangeText={setName} 
          style={styles.input} />
        <Text style={styles.headline}>Description</Text>
        <TextInput
          placeholder="Type a description about the cat."
          placeholderTextColor = "#888"
          onChangeText={setInfo} 
          style={styles.descInput} 
          multiline={true}/>
        <Text style={styles.headline}> Extra Photos</Text>
        <Text style={styles.subHeading}> The photo you click will turn into the cat's profile picture</Text>
        <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2000}>
          Creating Entry...
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default create_entry;

const styles = StyleSheet.create({
  subHeading: {
    fontSize: 15,
    color: '#000',
    textAlign: 'center',
    marginBottom: 0
  },
  entryContainer: {
    flexDirection: 'column', // Stack items vertically
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
    marginBottom: 20, // Space between catalog entries
    padding: 5,
    borderRadius:10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 40,
    textAlign: 'center',
  },
  headline: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  logoutButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
  },
  editButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
  },
  editText: {
    color: '#fff',
    marginLeft: 0,
  },
  input: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
  descInput: {
    height: 120,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
});
