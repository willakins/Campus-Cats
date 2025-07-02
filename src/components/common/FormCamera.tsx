import React, { Dispatch } from 'react';
import { Image, Text, View } from 'react-native';

import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

import { Button, CameraButton, ImageButton } from './buttons';

interface FormCameraProps {
  photos: string[];
  setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
  imageHandler?: CatalogImageHandler;
  isCreate: boolean;
}

const FormCamera: React.FC<FormCameraProps> = ({
  photos,
  setPhotos,
  setPicsChanged,
  imageHandler,
  isCreate,
}) => {
  return (
    <>
      <Text style={textStyles.sectionTitle}>Add pictures</Text>
      <CameraButton
        onPhotoSelected={(newUri) => {
          if (setPicsChanged) {
            setPicsChanged(true);
          }
          setPhotos((prev) => [...prev, newUri]);
        }}
      />

      {isCreate ? (
        <View style={containerStyles.extraPicsContainer}>
          {photos.map((uri, idx) => (
            <View key={idx} style={containerStyles.imageWrapper}>
              <Image source={{ uri }} style={containerStyles.extraPic} />
              <Button
                style={buttonStyles.imageDeleteButton}
                onPress={() =>
                  setPhotos((prev) => prev.filter((u) => u !== uri))
                }
              >
                <Text style={textStyles.smallButtonText}>Delete</Text>
              </Button>
            </View>
          ))}
        </View>
      ) : (
        <>
          {photos.length > 0 && imageHandler ? (
            <>
              <Text style={textStyles.label}>Extra Photos</Text>
              <Text style={textStyles.detail}>
                The photo you click will turn into the profile picture
              </Text>
              <View style={containerStyles.extraPicsContainer}>
                {photos.map((pic, index) => (
                  <View key={index} style={containerStyles.imageWrapper}>
                    <ImageButton
                      key={index}
                      onPress={() => imageHandler.swapProfilePicture(pic)}
                    >
                      <Image
                        source={{ uri: pic }}
                        style={containerStyles.extraPic}
                      />
                    </ImageButton>
                    <Button
                      style={buttonStyles.imageDeleteButton}
                      onPress={() => imageHandler.confirmDeletion(pic)}
                    >
                      <Text style={textStyles.smallButtonText}>Delete</Text>
                    </Button>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </>
  );
};
export { FormCamera };
