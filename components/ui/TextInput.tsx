import { Control, FieldValues, Path, useController } from 'react-hook-form';
import { StyleProp, Text, TextInput as RNTextInput, TextInputProps as RNTextInputProps, TextStyle, View } from 'react-native';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { RuleType } from '@/types';
import { ErrorText } from './ErrorText';

export type TextInputProps = React.PropsWithoutRef<RNTextInputProps> & {
  label?: string;
  error?: string;
  style?: StyleProp<TextStyle>;
};

type ControlledInputProps<T extends FieldValues> = TextInputProps & {
  control: Control<T>;
  name: Path<T>;
  rules?: RuleType<T>;
};

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  style,
  ...props
}) => {
  const style_ = [textStyles.input, style];

  return (
    <View>
      {label && <Text style={textStyles.subHeading2}>{label}</Text>}
      <RNTextInput
        style={style_}
        {...props}
      />
      <ErrorText error={error} />
    </View>
  );
};
