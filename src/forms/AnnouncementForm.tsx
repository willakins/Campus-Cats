import React, { Dispatch } from 'react';
import { Image, Text, TextInput, View } from 'react-native';

import { Button, CameraButton } from '@/components';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

// TODO: Replace this with proper type checking via react-hook-forms
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnnouncementFormDataType = any;
type AnnouncementFormInputType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface AnnouncementFormProps {
  formData: AnnouncementFormDataType;
  setFormData: React.Dispatch<React.SetStateAction<AnnouncementFormDataType>>;
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  formData,
  setFormData,
  photos,
  setPhotos,
  setPicsChanged,
}) => {
  const handleChange = (field: string, val: AnnouncementFormInputType) => {
    setFormData((prev: AnnouncementFormDataType) => ({
      ...prev,
      [field]: val,
    }));
  };

  return (
    <View style={[containerStyles.card, { paddingBottom: '10%' }]}>
      <Text style={textStyles.label}>Title</Text>
      <View style={containerStyles.inputContainer}>
        <TextInput
          value={formData.title || ''}
          placeholder="title"
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('title', text)}
          style={textStyles.input}
        />
      </View>
      <Text style={textStyles.label}>Description</Text>
      <View style={[containerStyles.descInputContainer, { height: '30%' }]}>
        <TextInput
          value={formData.info || ''}
          placeholder="Type a description about the announcement."
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('info', text)}
          style={textStyles.input}
          multiline={true}
        />
      </View>
      <Text style={textStyles.label}>Alias (optional)</Text>
      <View style={containerStyles.inputContainer}>
        <TextInput
          value={formData.authorAlias || ''}
          placeholder="Choose an author alias to replace id"
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('authorAlias', text)}
          style={textStyles.descInput}
          multiline={false}
        />
      </View>
      <Text style={[textStyles.sectionTitle, { textAlign: 'center' }]}>
        Add Photos (optional)
      </Text>
      <CameraButton
        onPhotoSelected={(newPhotoUri) => {
          setPhotos((prevPics) => [...prevPics, newPhotoUri]);
          if (setPicsChanged) {
            setPicsChanged(true);
          }
        }}
      ></CameraButton>
      <View style={containerStyles.extraPicsContainer}>
        {photos ? (
          photos.map((pic, index) => (
            <View key={index} style={containerStyles.imageWrapper}>
              <Image source={{ uri: pic }} style={containerStyles.extraPic} />
              <Button
                style={buttonStyles.imageDeleteButton}
                onPress={() => {
                  setPhotos((prevPhotos) =>
                    prevPhotos.filter((uri) => uri !== pic),
                  );
                  if (setPicsChanged) {
                    setPicsChanged(true);
                  }
                }}
              >
                <Text style={textStyles.smallButtonText}>Delete</Text>
              </Button>
            </View>
          ))
        ) : (
          <Text>Loading images...</Text>
        )}
      </View>
    </View>
  );
};
export { AnnouncementForm };
