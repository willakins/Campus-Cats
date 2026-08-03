import React, { Dispatch } from 'react';
import { View, Text, Image } from 'react-native';
import { CameraButton, Button, ImageButton } from './Buttons';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

interface FormCameraProps {
    photos: string[];
    setPhotos: React.Dispatch<React.SetStateAction<string[]>>;
    setPicsChanged?: Dispatch<React.SetStateAction<boolean>>;
    isCreate: boolean;
    onPromotePhoto?: (uri: string) => void;
    onDeletePhoto?: (uri: string) => void;
}

const FormCamera: React.FC<FormCameraProps> = ({ photos, setPhotos, setPicsChanged, isCreate, onPromotePhoto, onDeletePhoto }) => {

    return (
        <>
            <Text style={textStyles.sectionTitle}>Add pictures</Text>
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
                        style={buttonStyles.imageDeleteButton}
                        onPress={() => setPhotos(prev => prev.filter((u) => u !== uri))}
                    >
                        <Text style={textStyles.smallButtonText}>Delete</Text>
                    </Button>
                    </View>
                ))}
                </View>
            ) : (
            <>
            {photos.length > 0 ? (
                <>
                <Text style={textStyles.label}>Extra Photos</Text>
                <Text style={textStyles.detail}>The photo you click will turn into the profile picture</Text>
                <View style={containerStyles.extraPicsContainer}>
                    {photos.map((pic, index) => (
                    <View key={index} style={containerStyles.imageWrapper}>
                        <ImageButton key={index} onPress={() => onPromotePhoto?.(pic)}>
                        <Image source={{ uri: pic }} style={containerStyles.extraPic} />
                        </ImageButton>
                        <Button style={buttonStyles.imageDeleteButton} onPress={() => onDeletePhoto?.(pic)}>
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
    )
}
export { FormCamera };
