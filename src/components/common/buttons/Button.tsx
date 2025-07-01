import {
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

import { buttonStyles, textStyles } from '@/styles';

type ButtonProps = React.PropsWithoutRef<TouchableOpacityProps> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
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
