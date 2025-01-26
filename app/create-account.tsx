import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TextInput, Button } from 'react-native';
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <TextInput
        style={styles.input}
        value={username}
        placeholder='Enter your email'
        onChangeText={(text) => setUsername(text)}
      />
      <TextInput
        style={styles.input}
        onChangeText={(text) => setPassword(text)}
        value={password}
        placeholder="Enter your password"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button title="Register" onPress={validateNewUser} />
  </View>
  );
}

export default CreateAccount;

const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  input: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
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
});