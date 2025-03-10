import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import { PhotoHandler } from '@/components';

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
  const style_: StyleProp<ViewStyle> = [styles.button, style];
  const textStyle_: StyleProp<TextStyle> = [styles.buttonText, textStyle];

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
    <TouchableOpacity style={[styles.iconButton, style]} onPress={onPress} {...props}>
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
  const style_: StyleProp<ViewStyle> = [styles.imageButton, style];
  const textStyle_: StyleProp<TextStyle> = [styles.buttonText, textStyle];

  return (
    <TouchableOpacity style={style_} {...props}>
      <Text style={textStyle_}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

export const CameraButton: React.FC<CameraButtonProps> = ({ onPhotoSelected, style }) => {
  const style_: StyleProp<ViewStyle> = [styles.imageButton, style];
  const photoHandler = new PhotoHandler(onPhotoSelected);
  
  return (
    <View style={styles.cameraView}>
      <Button style={styles.cameraButton} onPress={() => photoHandler.handlePress()}>
        <Ionicons name="camera-outline" size={29} color="#fff" />
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    margin: 5,
    display: 'flex',
    justifyContent: 'center',
  },
  iconButton: {
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imageButton: {
    backgroundColor: '#333',
    borderRadius: 10,
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  cameraButton: {
    width: 70,  // Width of the circle
    height: 70, // Height of the circle (same as width to make it circular)
    borderRadius: 35, // Half of width/height to make it circular
    backgroundColor: '#333', // Button color (blue)
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
    elevation: 5,  // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.5,
    paddingVertical: 10,  // Vertical padding
    paddingHorizontal: 20, // Horizontal padding
  },
  cameraView: {
    alignItems: 'center',
    paddingVertical: 20,  // Vertical padding
  },
});
