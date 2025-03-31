import { Control, FieldValues, Path, useController } from 'react-hook-form';
import { StyleProp, Text, TextInput as RNTextInput, TextInputProps as RNTextInputProps, TextStyle, View } from 'react-native';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

import { RuleType } from '@/types';

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
      {error && <Text style={textStyles.errorText}>{error}</Text>}
    </View>
  );
};

export const ControlledInput = <T extends FieldValues>({
  control,
  name,
  rules,
  ...props
}: ControlledInputProps<T>) => {
  const { field, fieldState } = useController({ control, name, rules });
  return (
    <TextInput
      onChangeText={field.onChange}
      value={field.value || ''}
      {...props}
      error={fieldState.error?.message}
      style={textStyles.input}
    />
  );
};
