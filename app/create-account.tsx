import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Button, TouchableOpacity, Image } from 'react-native';
import { StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from "./logged-in/firebase";

const CreateAccount = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const validateNewUser = async () => {
    // Simple validation
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
  
    const userCredential = await createUserWithEmailAndPassword(auth, username, password);
    const { uid } = userCredential.user;

    await setDoc(doc(db, 'users', uid), { role: 0, name:username }); // Default role: 0 (regular user)

    router.push('/logged-in');
  
      
  };

  const goBack = () => {
    router.push('/login')
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/campus_cats_logo.png')} style={styles.logo}/>
        <View style={styles.inputContainer}>
          <TextInput 
            placeholder="Email" 
            onChangeText={(text) => setUsername(text)}
            style={styles.input} 
            keyboardType="email-address" />
          <TextInput 
            placeholder="Password" 
            onChangeText={(text) => setPassword(text)}
            style={styles.input} 
            secureTextEntry />
          <TouchableOpacity style={styles.button} onPress={validateNewUser}>
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress = {goBack}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    </View>
  );
}

export default CreateAccount;
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splashImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  homeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  inputContainer: {
    width: '80%',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    elevation: 3,  // Adds shadow on Android
    shadowColor: '#000',  // Adds shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    margin: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  
});