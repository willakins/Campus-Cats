import React, { Dispatch } from 'react';
import { View, Text, Switch, TextInput, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import DropdownPicker from 'react-native-dropdown-picker';
import { CameraButton, DateTimeInput, Button, ImageButton } from '@/components';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';

interface SightingFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  value: string;
  setValue: Dispatch<React.SetStateAction<any>>;
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
  items: any[];
  setItems: Dispatch<React.SetStateAction<any>>;
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
  imageHandler?:CatalogImageHandler;
  isCreate: boolean;
}

const SightingForm: React.FC<SightingFormProps> = ({
  formData, setFormData, value, setValue,
  open, setOpen, items, setItems, photos, setPhotos, setPicsChanged, imageHandler, isCreate
}) => {
  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }));
  };

  return (
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
        onPress={(e) => handleChange('location', e.nativeEvent.coordinate)}
      >
        <Marker coordinate={formData.location} />
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
      <DateTimeInput date={formData.date} setDate={(date) => handleChange('date', date)} />
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
        style={containerStyles.inputContainer2}
      />
      <Text style={textStyles.label}>Additional Notes</Text>
      <View style={containerStyles.descInputContainer}>
        <TextInput
          placeholder="what is the cat up to?"
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('info', text)}
          style={textStyles.input}
          multiline
        />
      </View>
      <View style={containerStyles.switchRow}>
        <Switch value={formData.fed} onValueChange={(val) => handleChange('fed', val)} />
        <Text style={textStyles.label}>Has been fed</Text>
      </View>

      <View style={containerStyles.switchRow}>
        <Switch value={formData.health} onValueChange={(val) => handleChange('health', val)} />
        <Text style={textStyles.label}>Is in good health</Text>
      </View>

      <Text style={textStyles.titleCentered}>Add pictures</Text>
      <CameraButton onPhotoSelected={(newUri) => {
        if (setPicsChanged) {setPicsChanged(true)};
        setPhotos(prev => [...prev, newUri])}} />
      {isCreate ? <View style={containerStyles.extraPicsContainer}>
        {photos.map((uri, idx) => (
          <View key={idx} style={containerStyles.imageWrapper}>
            <Image source={{ uri }} style={containerStyles.extraPic} />
            <Button
              style={buttonStyles.deleteButton}
              onPress={() => setPhotos(prev => prev.filter((u) => u !== uri))}
            >
              <Text style={textStyles.deleteButtonText}>Delete</Text>
            </Button>
          </View>
        ))}
      </View>: <>
      {photos.length > 1 && imageHandler ? <><Text style={textStyles.label}>Extra Photos</Text>
      <Text style={textStyles.subHeading}> The photo you click will turn into the cat's profile picture</Text>
      <View style={containerStyles.extraPicsContainer}>
        {photos ? (photos.map((pic, index) => (
          <View key={index} style={containerStyles.imageWrapper}>
            <ImageButton key={index} onPress={() => imageHandler.swapProfilePicture(pic)}>
              <Image source={{ uri: pic }} style={containerStyles.extraPic} />
            </ImageButton>
            <Button style={buttonStyles.deleteButton} onPress={() => imageHandler.confirmDeletion(pic)}>
              <Text style={textStyles.deleteButtonText}>Delete</Text>
            </Button>
          </View>
        ))):<Text>Loading images...</Text>}
      </View></>: null}
      </>}
    </View>
  );
};

export { SightingForm };
