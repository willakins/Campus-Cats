import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Button, TouchableOpacity, Image } from 'react-native';
import { StyleSheet } from 'react-native';

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
  
    try {
      router.push('/logged-in');
      /** This is where you would register the user in database
  
      if (response.data.success) {
        // On success, navigate to the Home screen
        router.push('/logged-in');
      } else {
        setError('Registration failed: ' + response.data.message);
      }
        */
    } catch (error) {
      setError('An error occurred. Please try again later.');
    }
      
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
          <Link href="/login" style={styles.button}>
            <TouchableOpacity>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </Link>
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