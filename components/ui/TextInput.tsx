import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  Text,
  View,
} from 'react-native';

import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';

export type TextInputProps = React.PropsWithoutRef<RNTextInputProps> & {
  label?: string;
};

export const TextInput: React.FC<TextInputProps> = ({
  label,
  style,
  ...props
}) => {
  const style_ = [textStyles.input, style];

  return (
    <View>
      {label && (
        <Text style={[textStyles.detail, { marginLeft: 12 }]}>{label}</Text>
      )}
      <RNTextInput style={style_} {...props} />
    </View>
  );
};
