import React, { Dispatch } from 'react';
import { View, Text, Switch, TextInput, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import DropdownPicker from 'react-native-dropdown-picker';
import { CameraButton, DateTimeInput, Button, ImageButton, FormCamera } from '@/components';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';

interface StationFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  photos: string[];
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
  imageHandler?: CatalogImageHandler;
  isCreate: boolean;
}

const StationForm: React.FC<StationFormProps> = ({
  formData, setFormData, photos, profile, setPhotos, setPicsChanged, imageHandler, isCreate
}) => {
    const handleChange = (field: string, val: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: val }));
    };

    return (
        <View style={containerStyles.card}>
            {!isCreate && profile ?  (<Image source={{ uri: profile }} style={containerStyles.imageMain} />): null}
            <Text style={textStyles.label}>Station Location</Text>
            <MapView
                style={containerStyles.mapContainer}
                initialRegion={{
                latitude: 33.7756, // Default location (e.g., Georgia Tech)
                longitude: -84.3963,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
                }}
                onPress={(e) => handleChange('location', e.nativeEvent.coordinate)}
            >
                {location ? <Marker coordinate={formData.location} /> : null}
            </MapView>
            <Text style={textStyles.label}>Station Name</Text>
            <View style={containerStyles.inputContainer2}>
                <TextInput 
                    value={formData.name || ''}
                    placeholder="What should this station be called?"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('name', text)} 
                    style={textStyles.input} />
            </View>
            <Text style={textStyles.subHeading2}>Last Time Stocked</Text>
            <DateTimeInput date={formData.lastStocked} setDate={(text) => handleChange('lastStocked', text)}/>
            <Text style={textStyles.label}>How Often Does This Station Need to be restocked? (in days)</Text>
            <View style={containerStyles.inputContainer2}>
                <TextInput
                    value={formData.stockingFreq || ''}
                    placeholder={"7"}
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('stockingFreq', text)}
                    style={textStyles.input}/>
            </View>
            <Text style={textStyles.label}>Cats Known to Frequent This Station (optional)</Text>
            <View style={containerStyles.inputContainer2}>
                <TextInput
                    value={formData.knownCats || ''}
                    placeholder={"Common cats seen here"}
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('knownCats', text)} 
                    style={[textStyles.input, {height:'30%'}]}
                    multiline={true} />
            </View>
            <FormCamera
                photos={photos}
                setPhotos={setPhotos}
                setPicsChanged={setPicsChanged}
                imageHandler={imageHandler}
                isCreate={isCreate}/>
        </View>
    )
}
export { StationForm };