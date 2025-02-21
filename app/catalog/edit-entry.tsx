import CatalogEntry from "@/components/CatalogEntry";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, ScrollView, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput} from 'react-native';
import MapView, { LatLng, Marker } from "react-native-maps";

const edit_entry = () => {
    const router = useRouter();
    const { paramId, paramName, paramProfile, paramInfo, paramLatitude, paramLongitude} = useLocalSearchParams();
    const id = paramId as string;
    const [profilePhoto, setProfilePhoto] = useState<string>(paramProfile as string);
    const [info, setInfo] = useState<string>(paramInfo as string);
    const [longitude, setLongitude] = useState<number>(parseFloat(paramLongitude as string));
    const [latitude, setLatitude] = useState<number>(parseFloat(paramLatitude as string));
    const [name, setName] = useState<string>(paramName as string);
    var most_recent_sighting:LatLng = {
      latitude: latitude,
      longitude: longitude,
    };

    const handleBack = () => {
        router.push({
            pathname: "/catalog/view-entry", // Dynamically navigate to the details page
            params: { paramId:id, paramName:name, paramProfile:profilePhoto, paramInfo:info, paramLatitude:latitude, 
              paramLongitude:longitude}, // Pass the details as query params
          });
    };

    const handleSave = () => {
        //Todo: connect to database to update stuff
        router.push({
            pathname: "/catalog/view-entry", // Dynamically navigate to the details page
            params: { paramId:id, paramName:name, paramProfile:profilePhoto, paramInfo:info, paramLatitude:latitude, 
              paramLongitude:longitude}, // Pass the details as query params
          });
    };

    const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: any; longitude: any; }; }; }) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      setLatitude(latitude);
      setLongitude(longitude);
    };

    return (
      <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={25} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={handleSave}>
          <Text style ={styles.editText}> Edit Entry</Text>
        </TouchableOpacity>
        <Text style={styles.headline}>Edit A Catalog Entry</Text>
        <TextInput 
            placeholder={name}
            placeholderTextColor = '#888'
            onChangeText={setName} 
            style={styles.input} />
          <TextInput
            placeholder={info}
            placeholderTextColor = '#888'
            onChangeText={setInfo} 
            style={styles.input} />
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 33.7756, // Default location (e.g., Georgia Tech)
            longitude: -84.3963,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress} // This updates the location correctly
        >
          {location && <Marker coordinate={most_recent_sighting} />}
        </MapView>
      </ScrollView>
    </KeyboardAvoidingView>
    );
}

export default edit_entry;

const styles = StyleSheet.create({
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
    padding: 10,
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
  cameraButton: {
    width: 70,  // Width of the circle
    height: 70, // Height of the circle (same as width to make it circular)
    borderRadius: 35, // Half of width/height to make it circular
    backgroundColor: '#333', // Button color (blue)
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
    elevation: 5,  // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
    paddingVertical: 10,  // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
  },
  sliderText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    padding: 10,
  },
  dateText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    justifyContent: 'flex-start',
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