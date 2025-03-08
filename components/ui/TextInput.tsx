import { Control, FieldValues, Path, useController } from 'react-hook-form';
import { StyleProp, StyleSheet, Text, TextInput as RNTextInput, TextInputProps as RNTextInputProps, TextStyle, View } from 'react-native';

import { RuleType } from '@/types';

type TextInputProps = React.PropsWithoutRef<RNTextInputProps> & {
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
  const style_ = [styles.textInput, style];

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={style_}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
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
    />
  );
};

const styles = StyleSheet.create({
  label: {
  },
  error: {
    color: 'red',
    fontSize: 10,
  },
  textInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
});
