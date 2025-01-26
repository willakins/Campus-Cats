import { Link, Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Button, TextInput, TouchableOpacity, View, Image, Text } from "react-native";
import { StyleSheet } from 'react-native';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./logged-in/firebase"; // Ensure you have the firebase.js file configured



const Login = () => {
    const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [error, setError] = useState('');
      const router = useRouter();
    
      const validateUser = async () => {
        // Simple validation
        if (!username || !password) {
          setError('Please enter both username and password');
          return;
        }
      
        try {
          await signInWithEmailAndPassword(auth, username, password);
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
          setError(error.message);
        }
          
      };

      const createAnAccount = () => {
        router.push('/create-account')
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
            <TouchableOpacity style={styles.button} onPress = {validateUser}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress = {createAnAccount}>
                <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
                
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>
      );
}

export default Login;


const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    marginBottom: 10,
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
    display: 'flex',
    justifyContent: 'center',
  },
  buttonText: {
    flex: 1,
    color: '#fff',
    fontWeight: 'bold',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    textAlign: 'center',
  },
  
});