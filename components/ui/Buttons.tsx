import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';

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
  const style_: StyleProp<ViewStyle> = [styles.button, style];
  const textStyle_: StyleProp<TextStyle> = [styles.buttonText, textStyle];

  return (
    <TouchableOpacity style={style_} {...props}>
      <Text style={textStyle_}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

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
}

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
});
