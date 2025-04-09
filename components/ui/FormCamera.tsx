import React, { Dispatch } from 'react';
import { View, Text, Image } from 'react-native';
import { CameraButton, Button, ImageButton } from './Buttons';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { CatalogImageHandler } from '@/image_handlers/CatalogImageHandler';

interface FormCameraProps {
    photos: string[];
    setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
    setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
    imageHandler?: CatalogImageHandler;
    isCreate: boolean;
}

const FormCamera: React.FC<FormCameraProps> = ({ photos, setPhotos, setPicsChanged, imageHandler, isCreate }) => {

    return (
        <>
            <Text style={textStyles.titleCentered}>Add pictures</Text>
            <CameraButton onPhotoSelected={(newUri) => {
                if (setPicsChanged) { setPicsChanged(true); }
                setPhotos(prev => [...prev, newUri])
            }} />

            {isCreate ? (
                <View style={containerStyles.extraPicsContainer}>
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
                </View>
            ) : (
            <>
            {photos.length > 0 && imageHandler ? (
                <>
                <Text style={textStyles.label}>Extra Photos</Text>
                <Text style={textStyles.subHeading}>The photo you click will turn into the cat's profile picture</Text>
                <View style={containerStyles.extraPicsContainer}>
                    {photos.map((pic, index) => (
                    <View key={index} style={containerStyles.imageWrapper}>
                        <ImageButton key={index} onPress={() => imageHandler.swapProfilePicture(pic)}>
                        <Image source={{ uri: pic }} style={containerStyles.extraPic} />
                        </ImageButton>
                        <Button style={buttonStyles.deleteButton} onPress={() => imageHandler.confirmDeletion(pic)}>
                        <Text style={textStyles.deleteButtonText}>Delete</Text>
                        </Button>
                    </View>
                    ))}
                </View>
                </>
            ) : null}
            </>
        )}
        </>
    )
}
export { FormCamera };