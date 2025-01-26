import { Link, Stack } from "expo-router";
import { Button, TextInput, TouchableOpacity, View, Image, Text } from "react-native";
import { StyleSheet } from 'react-native';

const Login = () => {
    return (
        <View style={styles.container}>
          <Image source={require('../assets/images/campus_cats_logo.png')} style={styles.logo}/>
          <View style={styles.inputContainer}>
            <TextInput placeholder="Email" style={styles.input} keyboardType="email-address" />
            <TextInput placeholder="Password" style={styles.input} secureTextEntry />
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button}>
                <Link href="/create-account">
                    <Text style={styles.buttonText}>Create Account</Text>
                </Link>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      );
}

export default Login;


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
  
});