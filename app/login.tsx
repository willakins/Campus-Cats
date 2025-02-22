import { Link, Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Button, TextInput, TouchableOpacity, View, Image, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { StyleSheet } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./logged-in/firebase"; // Ensure you have the firebase.js file configured
import { AdminContext } from "./AdminContext";
import { doc, getDoc } from "firebase/firestore";


const Login = () => {
  const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const { adminStatus, setAdminStatus } = useContext(AdminContext);
  
    const handleLogin = async () => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, username, password);
        await checkUserRole(userCredential.user.uid);
        router.push("/logged-in");
      } catch (error: any) {
        setError(error.message);
      }
    };
      
  const checkUserRole = async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (userDoc.exists()) {
      const userRole = userDoc.data().role;
      // Set the role accordingly in the context
      alert(userRole);
      setAdminStatus(userRole === 1 || userRole === 2); // Assuming role 1 or 2 is admin
    } else {
      console.log("No user document found!");
    }
  };
      

      const createAnAccount = () => {
        router.push('/create-account')
      };
    return (
      <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
      >
      <ScrollView contentContainerStyle={styles.scrollView}>
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
            <TouchableOpacity style={styles.button} onPress = {handleLogin}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress = {createAnAccount}>
                <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
                
            <TouchableOpacity onPress={() => alert("Contact an Administrator")}>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      );
}

export default Login;


const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
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
    width: '100%',
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
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',

  },
  forgotPassword: {
    marginTop: 10,
    color: '#007BFF',
    textAlign: 'center',
  },
  
});
