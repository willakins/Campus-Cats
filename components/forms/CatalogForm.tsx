import React, { Dispatch, SetStateAction } from 'react';
import { View, Text, TextInput, Image } from 'react-native';
import DropdownPicker from 'react-native-dropdown-picker';
import { FormCamera } from '@/components';
import { containerStyles, textStyles } from '@/styles';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';

export interface PickerConfig {
    value: string;
    setValue: Dispatch<SetStateAction<string>>;
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    items: { label: string; value: string }[];
    setItems: Dispatch<SetStateAction<{ label: string; value: string }[]>>;
}

interface CatalogFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  pickers: {
    statusPicker: PickerConfig;
    tnrPicker: PickerConfig;
    sexPicker: PickerConfig;
    furPicker: PickerConfig;
  };
  photos: string[];
  profile?: string;
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
  imageHandler?: CatalogImageHandler;
  isCreate: boolean;
}

const CatalogForm: React.FC<CatalogFormProps> = ({
  formData, setFormData, pickers, photos, profile, setPhotos, setPicsChanged, imageHandler, isCreate
}) => {
    const handleChange = (field: string, val: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: val }));
    };

    return (
        <View style={containerStyles.card}>
            {!isCreate && profile ? (<Image source={{ uri: profile }} style={containerStyles.imageMain}/>) : 
            <Text style={textStyles.titleCentered}>Loading image...</Text>}
            <Text style={textStyles.label}>Cat's Name</Text>
            <View style={containerStyles.inputContainer}>
                <TextInput 
                    value={formData.name || ''}
                    placeholder="name"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('name', text)} 
                    style={textStyles.input}
                    multiline={false} />
            </View>
            <Text style={textStyles.label}>Short Description</Text>
            <View style={containerStyles.inputContainer}>
                <TextInput
                    value={formData.descShort || ''}
                    placeholder="Write a short descriptive phrase"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('descShort', text)} 
                    style={textStyles.input} 
                    multiline={false}/>
            </View>
            <Text style={textStyles.label}>Long Description</Text>
            <View style={containerStyles.descInputContainer}>
                <TextInput
                    value={formData.descLong || ''}
                    placeholder="Describe all the details about this cat"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('descLong', text)} 
                    style={textStyles.descInput} 
                    multiline={true}/>
            </View>
            <Text style={textStyles.label}>Detailed Color Pattern</Text>
            <View style={containerStyles.descInputContainer}>
                <TextInput
                    value={formData.colorPattern || ''}
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('colorPattern', text)} 
                    style={textStyles.descInput} 
                    multiline={true}/>
            </View>
            <Text style={textStyles.label}>Behavior</Text>
            <View style={containerStyles.descInputContainer}>
                <TextInput
                    value={formData.behavior || ''}
                    placeholder="How does this cat act?"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('behavior', text)} 
                    style={textStyles.descInput} 
                    multiline={true}/>
            </View>
            <Text style={textStyles.label}>Years Recorded</Text>
            <View style={containerStyles.inputContainer}>
                <TextInput
                    value={formData.yearsRecorded || ''}
                    placeholder="What years has this cat been seen?"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('yearsRecorded', text)} 
                    style={textStyles.input} 
                    multiline={false}/>
            </View>
            <Text style={textStyles.label}>Area of Residence</Text>
            <View style={containerStyles.inputContainer}>
                <TextInput
                    value={formData.AoR || ''}
                    placeholder="What areas does this cat stick around?"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('AoR', text)} 
                    style={textStyles.input} 
                    multiline={false}/>
            </View>
            <Text style={textStyles.label}>Current Status</Text>
            <DropdownPicker
                open={pickers.statusPicker.open}
                value={pickers.statusPicker.value}
                items={pickers.statusPicker.items}
                setOpen={pickers.statusPicker.setOpen}
                setValue={pickers.statusPicker.setValue}
                setItems={pickers.statusPicker.setItems}
                placeholder={isCreate ? 'Select a current status' : pickers.statusPicker.value}
                multiple={false}
                style={containerStyles.inputContainer}
            />
            <Text style={textStyles.label}>Fur Length</Text>
            <DropdownPicker
                open={pickers.furPicker.open}
                value={pickers.furPicker.value}
                items={pickers.furPicker.items}
                setOpen={pickers.furPicker.setOpen}
                setValue={pickers.furPicker.setValue}
                setItems={pickers.furPicker.setItems}
                placeholder={isCreate ? 'Select a fur length' : pickers.furPicker.value}
                multiple={false}
                style={containerStyles.inputContainer}
            />
            <Text style={textStyles.label}>Fur Pattern</Text>
            <View style={containerStyles.inputContainer}>
                <TextInput
                    value={formData.furPattern || ''}
                    placeholder="Calico, Tabby, Black and white, etc."
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('furPattern', text)} 
                    style={textStyles.input} 
                    multiline={false}/>
            </View>
            <Text style={textStyles.label}>Tnr</Text>
            <DropdownPicker
                open={pickers.tnrPicker.open}
                value={pickers.tnrPicker.value}
                items={pickers.tnrPicker.items}
                setOpen={pickers.tnrPicker.setOpen}
                setValue={pickers.tnrPicker.setValue}
                setItems={pickers.tnrPicker.setItems}
                placeholder={isCreate ? 'Select Tnr status' : pickers.tnrPicker.value}
                multiple={false}
                style={containerStyles.inputContainer}
            />
            <Text style={textStyles.label}>Sex</Text>
            <DropdownPicker
                open={pickers.sexPicker.open}
                value={pickers.sexPicker.value}
                items={pickers.sexPicker.items}
                setOpen={pickers.sexPicker.setOpen}
                setValue={pickers.sexPicker.setValue}
                setItems={pickers.sexPicker.setItems}
                placeholder={isCreate ? 'Select sex of cat' : pickers.sexPicker.value}
                multiple={false}
                style={containerStyles.inputContainer}
            />
            <Text style={textStyles.label}>Credits</Text>
            <View style={containerStyles.descInputContainer}>
                <TextInput
                    value={formData.credits || ''}
                    placeholder="credits"
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('credits', text)} 
                    style={textStyles.descInput} 
                    multiline={true}/>
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
export { CatalogForm };