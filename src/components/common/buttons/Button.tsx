import { Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { buttonStyles, textStyles } from '@/styles';

export const Button = ({
  children,
  style,
  ...props
}: TouchableOpacityProps) => {
  return (
    <TouchableOpacity style={[buttonStyles.bigButton, style]} {...props}>
      <Text style={textStyles.bigButtonText}>{children}</Text>
    </TouchableOpacity>
  );
};

export const ImageButton = ({
  children,
  style,
  ...props
}: TouchableOpacityProps) => {
  return (
    <TouchableOpacity style={[buttonStyles.imageButton, style]} {...props}>
      <Text style={textStyles.smallButtonText}>{children}</Text>
    </TouchableOpacity>
  );
};
