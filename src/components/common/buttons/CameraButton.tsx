import { StyleProp, View, ViewStyle } from 'react-native';

import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';

import { PhotoHandler } from '@/image_handlers/PhotoHandler';
import { buttonStyles, containerStyles } from '@/styles';

type CameraButtonProps = {
  onPhotoSelected: (uri: string) => void;
  style?: StyleProp<ViewStyle>;
};

export const CameraButton: React.FC<CameraButtonProps> = ({
  onPhotoSelected,
}) => {
  const photoHandler = new PhotoHandler(onPhotoSelected);

  return (
    <View style={containerStyles.cameraContainer}>
      <Button
        style={buttonStyles.cameraButton}
        onPress={() => photoHandler.promptForImageSource()}
      >
        <Ionicons name="camera-outline" size={29} color="#fff" />
      </Button>
    </View>
  );
};
