import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, } from 'react-native';

import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { LatLng, MapPressEvent, Marker } from 'react-native-maps';

import { Button, CameraButton, TextInput } from '@/components';
import DatabaseService from '@/components/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';

const CatReportScreen = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(true);
  const [fed, setFed] = useState<boolean>(false);
  const [health, setHealth] = useState<boolean>(false);
  const [photoUrl, setPhotoURL] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [longitude, setLongitude] = useState<number>(-84.3963);
  const [latitude, setLatitude] = useState<number>(33.7756);
  const [name, setName] = useState<string>('');
  const router = useRouter();
  const database = DatabaseService.getInstance();

  var location:LatLng = {
    latitude: latitude,
    longitude: longitude,
  };

  const handleSubmission = () => {
    database.handleReportSubmission(name, info, photoUrl, fed, health, date, longitude, latitude);
    router.push('/(app)/(tabs)')
  }

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };

  const handleDateChange = (event: any, selectedDate: any) => {
    // If a date is selected, immediately update the date state
    setDate(selectedDate || date);
    setShowPicker(false); // Close the picker once a date is selected
  };

  return (
    <KeyboardAvoidingView
      style={containerStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // iOS specific behavior
    >
      <Button style={buttonStyles.logoutButton} onPress={() => router.push('/(app)/(tabs)')}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Button style={buttonStyles.editButton} onPress={handleSubmission}>
        <Text style= {textStyles.editText}>Submit Sighting</Text>
      </Button>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <View style={containerStyles.container}>
        <Text style={textStyles.catalogTitle}>Report A Sighting</Text>
          <View style={containerStyles.inputContainer}>
            <MapView
              style={containerStyles.mapContainer}
              initialRegion={{
                latitude: 33.7756, // Default location (e.g., Georgia Tech)
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress} // This updates the location correctly
            >
              {location ? <Marker coordinate={location} /> : null}
            </MapView>
            <View style={containerStyles.dateInput}>
              <Text style={textStyles.sliderText}>{date ? date.toDateString() : 'Select Sighting Date'}</Text>
              <TouchableOpacity  onPress={() => setShowPicker(true)}>
                {showPicker ? <DateTimePicker
                  value={date || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}/> : null}
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Cat's name"
              placeholderTextColor="#888"
              onChangeText={setName}
              style={textStyles.input}
            />
            <TextInput
              placeholder="Additional Info"
              placeholderTextColor="#888"
              value={info}
              onChangeText={setInfo}
              style={textStyles.input}
            />
            <View style={containerStyles.sliderContainer}>
              <Switch value={health} onValueChange={setHealth}/>
              <Text style={textStyles.sliderText}>Has been fed</Text>
            </View>
            <View style={containerStyles.sliderContainer}>
              <Switch value={fed} onValueChange={setFed} />
              <Text style={textStyles.sliderText}>Is in good health</Text>
            </View>
            <CameraButton onPhotoSelected={setPhotoURL}></CameraButton>
            {photoUrl ? <Image source={{ uri: photoUrl }} style={containerStyles.selectedPreview} /> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
export default CatReportScreen;