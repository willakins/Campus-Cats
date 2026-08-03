import React from 'react';
import { Image, Text, TextInput, View } from 'react-native';

import { Button, CameraButton } from '@/components';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

export interface AnnouncementFormData {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
}

interface AnnouncementFormProps {
  readonly formData: AnnouncementFormData;
  readonly setFormData: React.Dispatch<React.SetStateAction<AnnouncementFormData>>;
  readonly photos: readonly string[];
  readonly setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  formData,
  setFormData,
  photos,
  setPhotos,
}) => {
  const handleChange = (field: keyof AnnouncementFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  return (
    <View style={[containerStyles.card, { paddingBottom: '10%' }]}>
      <Text style={textStyles.label}>Title</Text>
      <View style={containerStyles.inputContainer}>
        <TextInput
          value={formData.title}
          placeholder="title"
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('title', text)}
          style={textStyles.input}
        />
      </View>
      <Text style={textStyles.label}>Description</Text>
      <View style={[containerStyles.descInputContainer, { height: '30%' }]}>
        <TextInput
          value={formData.info}
          placeholder="Type a description about the announcement."
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('info', text)}
          style={textStyles.input}
          multiline
        />
      </View>
      <Text style={textStyles.label}>Alias (optional)</Text>
      <View style={containerStyles.inputContainer}>
        <TextInput
          value={formData.authorAlias}
          placeholder="Choose an author alias to replace id"
          placeholderTextColor="#888"
          onChangeText={(text) => handleChange('authorAlias', text)}
          style={textStyles.descInput}
        />
      </View>
      <Text style={[textStyles.sectionTitle, { textAlign: 'center' }]}>
        Add Photos (optional)
      </Text>
      <CameraButton
        onPhotoSelected={(newPhotoUri) =>
          setPhotos((current) => [...current, newPhotoUri])
        }
      />
      <View style={containerStyles.extraPicsContainer}>
        {photos.map((photo) => (
          <View key={photo} style={containerStyles.imageWrapper}>
            <Image source={{ uri: photo }} style={containerStyles.extraPic} />
            <Button
              style={buttonStyles.imageDeleteButton}
              onPress={() =>
                setPhotos((current) =>
                  current.filter((candidate) => candidate !== photo),
                )
              }
            >
              <Text style={textStyles.smallButtonText}>Delete</Text>
            </Button>
          </View>
        ))}
      </View>
    </View>
  );
};

export { AnnouncementForm };
