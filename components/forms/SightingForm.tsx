import React, { Dispatch } from 'react';
import { View, Text, Switch, TextInput, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import DropdownPicker from 'react-native-dropdown-picker';
import { CameraButton, DateTimeInput, Button, ImageButton, FormCamera } from '@/components';
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
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
  imageHandler?: CatalogImageHandler;
  isCreate: boolean;
}

const SightingForm: React.FC<SightingFormProps> = ({
  formData, setFormData, value, setValue,
  open, setOpen, items, setItems, photos, profile, setPhotos, setPicsChanged, imageHandler, isCreate
}) => {
  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }));
  };

  return (
    <View style={containerStyles.card}>
      {!isCreate && profile ?  (<Image source={{ uri: profile }} style={containerStyles.imageMain} />): null}

      <Text style={textStyles.label}>Location</Text>
      <MapView
        style={containerStyles.mapContainer}
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
      <View style={containerStyles.inputContainer}>
        <TextInput
          value={formData.name || ''}
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
        placeholder={isCreate ? 'Select a time of day' : value}
        multiple={false}
        style={containerStyles.inputContainer}
      />

      <Text style={textStyles.label}>Additional Notes</Text>
      <View style={containerStyles.descInputContainer}>
        <TextInput
          value={formData.info || ''} // controlled component value, default to '' if undefined
          placeholder="what is the cat up to?"
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('info', text)} // Update state on text change
          style={textStyles.input}
          multiline
        />
      </View>

      <View style={containerStyles.sectionCard}>
        <View style={containerStyles.rowStack}>
          <View style={containerStyles.rowContainer}>
            <Switch value={formData.fed} onValueChange={(val) => handleChange('fed', val)} />
            <Text style={textStyles.label}>Has been fed</Text>
          </View>

          <View style={containerStyles.rowContainer}>
            <Switch value={formData.health} onValueChange={(val) => handleChange('health', val)} />
            <Text style={textStyles.label}>Is in good health</Text>
          </View>
        </View>
      </View>
      
      
      <FormCamera
        photos={photos}
        setPhotos={setPhotos}
        setPicsChanged={setPicsChanged}
        imageHandler={imageHandler}
        isCreate={isCreate}/>
    </View>
  );
};

export { SightingForm };
