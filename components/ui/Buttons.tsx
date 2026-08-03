import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleProp, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import { appModules } from '@/composition/appModules';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type ButtonProps = React.PropsWithoutRef<TouchableOpacityProps> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

type CameraButtonProps = {
  onPhotoSelected: (uri: string) => void;
  style?: StyleProp<ViewStyle>;
};

type IconProps = React.PropsWithoutRef<TouchableOpacityProps> & {
  iconName: IoniconsName;
  iconSize?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
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
};


export const IconButton: React.FC<IconProps> = ({
  iconName,
  iconSize = 25,
  iconColor = '#fff',
  style,
  onPress,
  ...props
}) => {
  return (
    <TouchableOpacity style={[buttonStyles.button, style]} onPress={onPress} {...props}>
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};

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
};

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
  const select = async (camera: boolean) => {
    const result = camera
      ? await appModules.imageSelection.takePhoto()
      : await appModules.imageSelection.pickFromLibrary();
    if (!result.ok) {
      Alert.alert('Could not select image', result.error.message);
      return;
    }
    if (result.value) onPhotoSelected(result.value.localUri);
  };

  const promptForSource = () =>
    Alert.alert(
      'Select Option',
      'Would you like to take a photo or select from your library?',
      [
        { text: 'Take Photo', onPress: () => void select(true) },
        { text: 'Choose from Library', onPress: () => void select(false) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );

  return (
    <View style={containerStyles.cameraContainer}>
      <Button
        style={[buttonStyles.cameraButton, style]}
        onPress={promptForSource}
      >
        <Ionicons name="camera-outline" size={29} color="#fff" />
      </Button>
    </View>
  );
}
