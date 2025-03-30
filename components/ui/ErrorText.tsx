import { StyleSheet, Text, TextProps } from 'react-native';

type ErrorTextProps = Omit<TextProps, 'children'> & {
  error: string | undefined;
};

const ErrorText: React.FC<ErrorTextProps> = ({
  error,
  style,
  ...props
}) => {
  const style_ = [styles.errorText, style];

  if (!error) {
    return <></>;
  }

  return (
    <Text style={style_} {...props}>
      {error}
    </Text>
  );
};

export { ErrorText };

const styles = StyleSheet.create({
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});
