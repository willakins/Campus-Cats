import CatalogEntry from "@/components/CatalogEntry";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, ScrollView, Text, View, TouchableOpacity} from 'react-native';
import { LatLng } from "react-native-maps";

const edit_entry = () =>{
    const router = useRouter();
    const { paramId, paramName, paramProfile, paramInfo, paramLatitude, paramLongitude, paramExtraPhotos} = useLocalSearchParams();
    const id = paramId as string;
    const name = paramName as string;
    const profilePhoto = paramProfile as string;
    const info = paramInfo as string;
    const latitude = parseFloat(paramLatitude as string);
    const longitude = parseFloat(paramLongitude as string);
    const extraPhotos = paramExtraPhotos as string;
    var most_recent_sighting:LatLng = {
        latitude: latitude,
        longitude: longitude,
      };

    const handleBack = () => {
        router.push({
            pathname: "/catalog/view-entry", // Dynamically navigate to the details page
            params: { paramId:id, paramName:name, paramProfile:profilePhoto, paramInfo:info, paramLatitude:latitude, 
              paramLongitude:longitude, paramExtraPhotos:extraPhotos}, // Pass the details as query params
          });
    };

    const handleSave = () => {
        //Todo: connect to database to update stuff
        router.push({
            pathname: "/catalog/view-entry", // Dynamically navigate to the details page
            params: { paramId:id, paramName:name, paramProfile:profilePhoto, paramInfo:info, paramLatitude:latitude, 
              paramLongitude:longitude, paramExtraPhotos:extraPhotos}, // Pass the details as query params
          });
    };

    return (
        <View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleBack}>
                <Ionicons name="arrow-back-outline" size={25} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} onPress={handleSave}>
                <Text style ={styles.editText}> Save Entry</Text>
            </TouchableOpacity>
            <CatalogEntry
                id={id}
                name={name}
                profilePhoto={profilePhoto}
                info={info}
                most_recent_sighting={most_recent_sighting}
                extraPhotos={extraPhotos}
                />
        </View>
    )
}

export default edit_entry();

const styles = StyleSheet.create({
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
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',

  },
  container: {
    flex: 1,
    backgroundColor: '#F4F4F9',
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  scrollView: {
    padding: 10,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F9',
  },
});