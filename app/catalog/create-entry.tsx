import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, TouchableOpacity, Text, ScrollView, TextInput, View, Image, StyleSheet } from "react-native";
import { Snackbar } from "react-native-paper";

const create_entry = () =>{
    const router = useRouter();
    const [visible, setVisible] = useState<boolean>(false);
    const [info, setInfo] = useState<String>("");
    const [name, setName] = useState<String>("");
    
    const handleBack = () => {
        router.push("/logged-in/catalog");
    };

    const handleCreate = () => {
        //TODO
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleBack}>
                <Ionicons name="arrow-back-outline" size={25} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} onPress={handleCreate}>
                <Text style ={styles.editText}> Create Entry</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.entryContainer}>
                <Text style={styles.title}>Create A Catalog Entry</Text>
                <Text style={styles.headline}>Cat's Name</Text>
                <TextInput 
                    placeholder="What is the cat's name?"
                    placeholderTextColor = '#888'
                    onChangeText={setName} 
                    style={styles.input} />
                <Text style={styles.headline}>Description</Text>
                <TextInput
                    placeholder="Type a description about the cat."
                    placeholderTextColor = '#888'
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
  profileButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  extraPicsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  imageWrapper: {
    alignItems: "center",
    margin: 10,
  },
  extraPic: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  image: {
    width: 400,  // Set a fixed width for the profile picture
    height: 250, // Set a fixed height for the profile picture
    borderRadius: 60,  // Makes the image circular
    paddingHorizontal: 20,
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
  map: {
    width: '100%', 
    height: 200, 
    paddingHorizontal: 15, 
    borderRadius:10,
    marginBottom: 10,
  },
  headline: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  cameraView: {
    alignItems: 'center',
    paddingVertical: 20,  // Vertical padding
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
  logoutText: {
    color: '#fff',
    marginLeft: 5,
  },
  editText: {
    color: '#fff',
    marginLeft: 0,
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  dinput: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: '#000',
    flexDirection: "row", 
  },
  dateInput: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    flexDirection: "row", 
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    margin: 5,
    display: 'flex',
    justifyContent: 'center',
  },
  dateButton: { padding: 12, backgroundColor: '#007bff', borderRadius: 5 },

  buttonText: {
    color: '#ffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',

  },
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    textAlign: 'center',
  },
  selectedPreview: {
    margin: 'auto', // Center the image
    objectFit: 'scale-down', // Don't clip the image
    width: 240,
    height: 180,
  },
});