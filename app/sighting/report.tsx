import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, Switch, Button, ActivityIndicator, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../logged-in/firebase";

const CatReportScreen = () => {
  const router = useRouter();

  const params = useLocalSearchParams();
  const cat = JSON.parse(params.cat as string);
  const [name, setName] = useState(cat.name);
  const [info, setInfo] = useState(cat.info);
  const [health, setHealth] = useState(cat.health);
  const [fed, setFed] = useState(cat.fed);

  // Now display the sighting for either admin or general user
  return (
    <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
          >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.container}>
          <Image source={{ uri: cat.image }} style={styles.catImage} />
          <View style={styles.inputContainer}>
            <TextInput 
            value={name} 
            onChangeText={setName} 
            style={styles.input} />
            <TextInput 
            value={info} 
            onChangeText={setInfo} 
            style={styles.input} />
            <View style={styles.slider}>
              <Switch value={health} onValueChange={setHealth}/>
              <Text style={styles.sliderText}>Has been fed</Text> 
            </View>
            <View style={styles.slider}>
              <Switch value={fed} onValueChange={setFed} />
              <Text style={styles.sliderText}>Is in good health</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={() => alert("Saved!")}>
              <Text style = {styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
            </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};


export default CatReportScreen;

const styles = StyleSheet.create({
  sliderText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    padding: 10,
  },
  slider: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  catImage: { 
    width: "100%", 
    height: 200, 
    borderRadius: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff', 
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
