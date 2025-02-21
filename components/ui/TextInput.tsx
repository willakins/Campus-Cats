import React from 'react';
import { StyleProp, StyleSheet, TextInput as RNTextInput, TextInputProps as RNTextInputProps, TextStyle } from 'react-native';

type TextInputProps = React.PropsWithoutRef<RNTextInputProps> & {
  style?: StyleProp<TextStyle>;
};

export const TextInput: React.FC<TextInputProps> = ({
	style,
	...props
}) => {
  const style_ = [styles.textInput, style];
  
  return (
    <RNTextInput
      style={style_}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
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
