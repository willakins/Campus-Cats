import { Ionicons } from '@expo/vector-icons';
import { StyleProp, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import { PhotoHandler } from '../image_handlers/PhotoHandler';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

type ButtonProps = React.PropsWithoutRef<TouchableOpacityProps> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type CameraButtonProps = {
  onPhotoSelected: (uri: string) => void;
  style?: StyleProp<ViewStyle>;
};

export const Button: React.FC<ButtonProps> = ({
	children,
	style,
	textStyle,
	...props
}) => {
  const style_: StyleProp<ViewStyle> = [buttonStyles.button, style];
  const textStyle_: StyleProp<TextStyle> = [textStyles.smallButtonText, textStyle];

  return (
    <TouchableOpacity style={style_} {...props}>
      <Text style={textStyle_}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export const BorderlessButton: React.FC<ButtonProps> = ({
	children,
	style,
	textStyle,
	...props
}) => {
  return (
    <TouchableOpacity style={style} {...props}>
      <Text style={textStyle}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export const ImageButton: React.FC<ButtonProps> = ({
	children,
	style,
	textStyle,
	...props
}) => {
  const style_: StyleProp<ViewStyle> = [buttonStyles.imageButton, style];
  const textStyle_: StyleProp<TextStyle> = [textStyles.smallButtonText, textStyle];

  return (
    <TouchableOpacity style={style_} {...props}>
      <Text style={textStyle_}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export const CameraButton: React.FC<CameraButtonProps> = ({ onPhotoSelected, style }) => {
  const style_: StyleProp<ViewStyle> = [buttonStyles.imageButton, style];
  const photoHandler = new PhotoHandler(onPhotoSelected);
  
  return (
    <View style={containerStyles.cameraView}>
      <Button style={buttonStyles.cameraButton} onPress={() => photoHandler.handlePress()}>
        <Ionicons name="camera-outline" size={29} color="#fff" />
      </Button>
    </View>
  );
}