import React, { useState } from 'react';
import { SafeAreaView, View, Text, Switch, TextInput, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DropdownPicker from 'react-native-dropdown-picker';
import { useRouter } from 'expo-router';
import { Snackbar } from 'react-native-paper';
import DatabaseService from '@/components/services/DatabaseService';
import { useAuth } from '@/providers';
import MapView, { LatLng, MapPressEvent, Marker } from 'react-native-maps';
import { buttonStyles, textStyles, containerStyles } from '@/styles';
import { CameraButton, DateTimeInput, Button } from '@/components';
import { CatSightingObject } from '@/types';

const CatReportScreen = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const { user } = useAuth();
  const [visible, setVisible] = useState<boolean>(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [value, setValue] = useState("");
  const [items, setItems] = useState([
    { label: 'Morning', value: 'morning' },
    { label: 'Afternoon', value: 'afternoon' },
    { label: 'Night', value: 'night' },
  ])
  const [formData, setFormData] = useState({
    name: "",
    info: "",
    fed: false,
    health: false,
    latitude: 0,
    longitude: 0,
    uid: user.id,
    timeofDay: "",
  });

  const [open, setOpen] = useState(false);

  // Update state when form fields change
  const handleChange = (field: string, value: any) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  // Function to create CatSighting object
  const createObj = () => {
    return new CatSightingObject(
      "-1",
      formData.name,
      formData.info,
      formData.fed,
      formData.health,
      date.toISOString().split('T')[0],
      formData.latitude,
      formData.longitude,
      formData.uid,
      value
    );
  };

  // Handle map press to set latitude and longitude
  const location: LatLng = {
    latitude: formData.latitude,
    longitude: formData.longitude,
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    handleChange('latitude', latitude);
    handleChange('longitude', longitude);
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <View style={containerStyles.snackbarContainer}>
        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          duration={2000}
          style={containerStyles.snackbar}
        >
          Creating Report...
        </Snackbar>
      </View>
      <Text style={textStyles.title}>Create A Report</Text>
      
      <FlatList
        data={[1]}  // A dummy array to make FlatList scrollable
        keyExtractor={() => '1'}
        contentContainerStyle={containerStyles.scrollView}
        renderItem={() => (
          <View style={containerStyles.card}>
            <Text style={textStyles.label}>Location</Text>
            <MapView
              style={containerStyles.map}
              initialRegion={{
                latitude: 33.7756,
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress}
            >
              <Marker coordinate={location} />
            </MapView>

            <Text style={textStyles.label}>Cat's Name</Text>
            <View style={containerStyles.inputContainer2}>
            <TextInput
              placeholder="name"
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('name', text)}
              style={textStyles.input}
            />
            </View>
            

            <Text style={textStyles.label}>Day of Sighting</Text>
            <DateTimeInput date={date} setDate={setDate} />

            <Text style={textStyles.label}>Time of Sighting</Text>
            <DropdownPicker
              open={open}
              value={value}
              items={items}
              setOpen={setOpen}
              setValue={setValue}
              setItems={setItems}

              placeholder="Select a time of day"
              multiple={false}
              theme="LIGHT"
              mode="SIMPLE"
              style={containerStyles.inputContainer2}
            />

            <Text style={textStyles.label}>Additional Notes</Text>
            <TextInput
              placeholder="what is the cat up to?"
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('info', text)}
              style={textStyles.descInput}
              multiline={true}
            />

            <View style={containerStyles.switchRow}>
              <Switch value={formData.fed} onValueChange={(val) => handleChange('fed', val)} />
              <Text style={textStyles.label}>Has been fed</Text>
            </View>

            <View style={containerStyles.switchRow}>
              <Switch value={formData.health} onValueChange={(val) => handleChange('health', val)} />
              <Text style={textStyles.label}>Is in good health</Text>
            </View>

            <Text style={textStyles.titleCentered}>Add a picture</Text>
            <CameraButton onPhotoSelected={(newPhotoUri) => setPhotos((prevPics) => [...prevPics, newPhotoUri])} />
            <View style={containerStyles.extraPicsContainer}>
              {photos.map((pic, index) => (
                <View key={index} style={containerStyles.imageWrapper}>
                  <Image source={{ uri: pic }} style={containerStyles.extraPic} />
                  <Button
                    style={buttonStyles.deleteButton}
                    onPress={() => setPhotos((prevPhotos) => prevPhotos.filter((uri) => uri !== pic))}
                  >
                    <Text style={textStyles.deleteButtonText}>Delete</Text>
                  </Button>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      <Button
        style={buttonStyles.button2}
        onPress={() => database.handleReportSubmission(createObj(), photos, setVisible, router)}
      >
        <Text style={textStyles.bigButtonText}>Create Report</Text>
      </Button>
    </SafeAreaView>
  );
};

export default CatReportScreen;
