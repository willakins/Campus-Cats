import { StyleProp, View, ViewStyle } from 'react-native';

import { PhotoHandler } from '@/image_handlers/PhotoHandler';
import { buttonStyles, containerStyles } from '@/styles';

import { IconButton } from './IconButton';

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
      <IconButton
        icon="camera-outline"
        size={29}
        style={buttonStyles.cameraButton}
        onPress={() => photoHandler.promptForImageSource()}
      />
    </View>
  );
};
