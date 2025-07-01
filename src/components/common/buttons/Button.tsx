import {
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { buttonStyles, textStyles } from '@/styles';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type ButtonProps = React.PropsWithoutRef<TouchableOpacityProps> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
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
  const textStyle_: StyleProp<TextStyle> = [
    textStyles.smallButtonText,
    textStyle,
  ];

  return (
    <TouchableOpacity style={style_} {...props}>
      <Text style={textStyle_}>{children}</Text>
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
    <TouchableOpacity
      style={[buttonStyles.button, style]}
      onPress={onPress}
      {...props}
    >
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
      <Text style={textStyle}>{children}</Text>
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
  const textStyle_: StyleProp<TextStyle> = [
    textStyles.smallButtonText,
    textStyle,
  ];

  return (
    <TouchableOpacity style={style_} {...props}>
      <Text style={textStyle_}>{children}</Text>
    </TouchableOpacity>
  );
};
